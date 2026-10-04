import type { AppMetaDao } from '@/core/db/appMetaDao';
import { isNetworkError } from '@/core/errors/AppError';
import type { ProfileRepository } from '@/features/profile/data/ProfileRepository';

import { AuthError } from '../domain/AuthError';
import { isCompleteOtp, isValidEmail, normalizeEmail } from '../domain/email';
import type { AuthUser } from '../domain/types';
import type { AuthRepository } from './AuthRepository';
import type { GuestDataDao } from './local/guestDataDao';
import type { AuthApi } from './remote/authApi';
import type { AppleAuthService } from './services/AppleAuthService';
import type { CryptoService } from './services/CryptoService';
import type { GoogleAuthService } from './services/GoogleAuthService';

export interface SupabaseAuthRepositoryDeps {
  api: AuthApi;
  apple: AppleAuthService;
  google: GoogleAuthService;
  crypto: CryptoService;
  profiles: ProfileRepository;
  appMeta: AppMetaDao;
  guestData: GuestDataDao;
  now: () => string;
  /** Resolves after `ms` (injected so tests control the restore budget). */
  delay: (ms: number) => Promise<void>;
}

/**
 * How long launch waits for Supabase before a returning user continues with their local profile.
 * An expired access token (anyone who last opened the app over an hour ago) is refreshed over the network
 * before Supabase answers, and offline it retries for ~25 s, all while the splash is up.
 */
export const SESSION_RESTORE_BUDGET_MS = 1000;

const guestUser = (id: string): AuthUser => ({
  id,
  email: null,
  displayName: null,
  avatarUrl: null,
  provider: 'guest',
});

/** Coordinates the provider SDKs, Supabase Auth and local persistence. Holds no state of its own. */
export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly deps: SupabaseAuthRepositoryDeps) {}

  isAppleAvailable(): Promise<boolean> {
    return this.deps.apple.isAvailable();
  }

  async signInWithApple(): Promise<AuthUser> {
    const rawNonce = this.deps.crypto.randomNonce();
    // Apple receives the SHA-256 of the nonce; Supabase receives the raw value and checks it against the token.
    const credential = await this.deps.apple.signIn(await this.deps.crypto.sha256(rawNonce));
    const user = await this.deps.api.signInWithIdToken('apple', credential.identityToken, rawNonce);
    const appleName = credential.fullName && !user.displayName ? credential.fullName : null;
    const signedIn = await this.completeSignIn(appleName ? { ...user, displayName: appleName } : user);
    if (appleName) await this.saveAppleName(signedIn.id, appleName);
    return signedIn;
  }

  async signInWithGoogle(): Promise<AuthUser> {
    const { idToken } = await this.deps.google.signIn();
    const user = await this.deps.api.signInWithIdToken('google', idToken);
    return this.completeSignIn(user);
  }

  async requestEmailOtp(email: string): Promise<void> {
    if (!isValidEmail(email)) throw new AuthError('Unknown', 'Invalid email address');
    await this.deps.api.requestEmailOtp(normalizeEmail(email));
  }

  async verifyEmailOtp(email: string, code: string): Promise<AuthUser> {
    if (!isCompleteOtp(code)) throw new AuthError('InvalidOtp');
    const user = await this.deps.api.verifyEmailOtp(normalizeEmail(email), code);
    return this.completeSignIn(user);
  }

  async continueAsGuest(): Promise<AuthUser> {
    const guestId = (await this.deps.appMeta.get('guest_id')) ?? this.deps.crypto.uuid();
    await this.deps.appMeta.set('guest_id', guestId);
    await this.deps.appMeta.set('guest_active', '1');
    await this.deps.profiles.ensureGuest(guestId);
    return guestUser(guestId);
  }

  async connectGoogle(): Promise<AuthUser> {
    // Only a guest in their own session can give their check-ins to an account.
    if (!(await this.isGuestActive())) throw new AuthError('Unknown', 'No guest session to connect');
    return this.signInWithGoogle();
  }

  async guestCheckInsOnDevice(): Promise<number> {
    if (await this.isGuestActive()) return 0;
    return this.deps.guestData.countGuestCheckIns();
  }

  async claimGuestData(userId: string): Promise<void> {
    const guestId = (await this.deps.appMeta.get('guest_id')) ?? '';
    await this.deps.guestData.reassignGuestData(guestId, userId, this.deps.now());
  }

  async restoreSession(): Promise<AuthUser | null> {
    const session = this.deps.api.getSessionUser();
    const overBudget = await Promise.race([
      session.then(
        () => false,
        () => false,
      ),
      this.deps.delay(SESSION_RESTORE_BUDGET_MS).then(() => true),
    ]);
    if (overBudget) {
      const localUser = await this.lastSignedInUser();
      if (localUser) {
        // Supabase keeps restoring in the background; onAuthStateChange delivers the refreshed user, or
        // signs out if the session turns out to have ended.
        session
          .then((user) => (user ? this.deps.profiles.saveFromAuth(user) : undefined))
          .catch(() => undefined);
        return localUser;
      }
    }
    try {
      const user = await session;
      if (user) {
        await this.deps.profiles.saveFromAuth(user);
        return user;
      }
    } catch (error) {
      // Offline with an expired access token: keep the person signed in with their local profile.
      if (!isNetworkError(error)) throw error;
      const offlineUser = await this.lastSignedInUser();
      if (offlineUser) return offlineUser;
    }
    const guestId = await this.deps.appMeta.get('guest_id');
    const guestActive = (await this.deps.appMeta.get('guest_active')) === '1';
    return guestId && guestActive ? guestUser(guestId) : null;
  }

  async signOut(): Promise<void> {
    if ((await this.deps.appMeta.get('guest_active')) === '1') {
      // Guest data (and guest_id) stay on the device so the guest can pick up where they left off.
      await this.deps.appMeta.remove('guest_active');
      return;
    }
    // This device's session first (it ends even offline): a sign-out that fails leaves Google signed in too.
    await this.deps.api.signOut();
    await this.deps.appMeta.remove('last_user_id');
    await this.deps.google.signOut();
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return this.deps.api.onAuthStateChange(callback);
  }

  /**
   * After any real sign-in: persist the profile, remember the user for offline restore, and hand over guest
   * data only when the sign-in came from inside the guest's own session (Connect Google). Check-ins a
   * logged-out guest left behind never move silently: the person is asked (guestCheckInsOnDevice).
   */
  private async completeSignIn(user: AuthUser): Promise<AuthUser> {
    await this.deps.profiles.saveFromAuth(user);
    const guestId = await this.deps.appMeta.get('guest_id');
    if (guestId && (await this.isGuestActive())) {
      await this.deps.guestData.reassignGuestData(guestId, user.id, this.deps.now());
    }
    await this.deps.appMeta.remove('guest_active');
    await this.deps.appMeta.set('last_user_id', user.id);
    return user;
  }

  private async isGuestActive(): Promise<boolean> {
    return (await this.deps.appMeta.get('guest_active')) === '1';
  }

  /**
   * Apple shares the name only on the first sign-in, so it is saved to the auth metadata and the profile
   * right away. The local profile already has it; failures here never fail the sign-in.
   */
  private async saveAppleName(userId: string, fullName: string): Promise<void> {
    const results = await Promise.allSettled([
      this.deps.api.updateFullName(fullName),
      this.deps.profiles.updateDisplayName(userId, fullName),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        const kind = result.reason instanceof Error ? result.reason.name : 'unknown';
        console.error(`[auth] Could not save the Apple name (${kind})`); // TODO(Sentry)
      }
    }
  }

  private async lastSignedInUser(): Promise<AuthUser | null> {
    const userId = await this.deps.appMeta.get('last_user_id');
    const profile = userId ? await this.deps.profiles.getLocal(userId) : null;
    if (!profile || profile.provider === 'guest') return null;
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      provider: profile.provider,
    };
  }
}
