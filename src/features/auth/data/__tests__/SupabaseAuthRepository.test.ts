import type { AppMetaDao } from '@/core/db/appMetaDao';
import type { AppMetaKey } from '@/core/db/schema';
import { createFakeProfileRepository, testProfile, testUser } from '@test/fakes/fakeRepositories';
import { mockFn } from '@test/fakes/mockFn';

import { AuthError } from '../../domain/AuthError';
import type { GuestDataDao } from '../local/guestDataDao';
import type { AuthApi } from '../remote/authApi';
import type { AppleAuthService } from '../services/AppleAuthService';
import type { CryptoService } from '../services/CryptoService';
import type { GoogleAuthService } from '../services/GoogleAuthService';
import { SupabaseAuthRepository } from '../SupabaseAuthRepository';

function memoryAppMeta(): AppMetaDao & { data: Map<AppMetaKey, string> } {
  const data = new Map<AppMetaKey, string>();
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => void data.set(key, value),
    remove: async (key) => void data.delete(key),
  };
}

function setup() {
  const api: jest.Mocked<AuthApi> = {
    signInWithIdToken: mockFn<AuthApi['signInWithIdToken']>(async (provider) => testUser({ provider })),
    requestEmailOtp: mockFn<AuthApi['requestEmailOtp']>(async () => undefined),
    verifyEmailOtp: mockFn<AuthApi['verifyEmailOtp']>(async () => testUser({ provider: 'email' })),
    updateFullName: mockFn<AuthApi['updateFullName']>(async () => undefined),
    getSessionUser: mockFn<AuthApi['getSessionUser']>(async () => null),
    signOut: mockFn<AuthApi['signOut']>(async () => undefined),
    onAuthStateChange: mockFn<AuthApi['onAuthStateChange']>(() => () => undefined),
  };
  const apple: jest.Mocked<AppleAuthService> = {
    isAvailable: mockFn<AppleAuthService['isAvailable']>(async () => true),
    signIn: mockFn<AppleAuthService['signIn']>(async () => ({
      identityToken: 'apple-id-token',
      fullName: null,
    })),
  };
  const google: jest.Mocked<GoogleAuthService> = {
    configure: mockFn<GoogleAuthService['configure']>(() => undefined),
    signIn: mockFn<GoogleAuthService['signIn']>(async () => ({ idToken: 'google-id-token' })),
    signOut: mockFn<GoogleAuthService['signOut']>(async () => undefined),
  };
  const crypto: jest.Mocked<CryptoService> = {
    randomNonce: mockFn<CryptoService['randomNonce']>(() => 'raw-nonce'),
    sha256: mockFn<CryptoService['sha256']>(async (input) => `sha256(${input})`),
    uuid: mockFn<CryptoService['uuid']>(() => 'new-guest-id'),
  };
  const guestData: jest.Mocked<GuestDataDao> = {
    reassignGuestData: mockFn<GuestDataDao['reassignGuestData']>(async () => undefined),
  };
  const profiles = createFakeProfileRepository();
  const appMeta = memoryAppMeta();
  const repo = new SupabaseAuthRepository({
    api,
    apple,
    google,
    crypto,
    profiles,
    appMeta,
    guestData,
    now: () => 'NOW',
  });
  return { repo, api, apple, google, crypto, guestData, profiles, appMeta };
}

describe('SupabaseAuthRepository', () => {
  describe('Apple', () => {
    it('sends the hashed nonce to Apple and the raw nonce to Supabase', async () => {
      const { repo, apple, api } = setup();
      await repo.signInWithApple();
      expect(apple.signIn).toHaveBeenCalledWith('sha256(raw-nonce)');
      expect(api.signInWithIdToken).toHaveBeenCalledWith('apple', 'apple-id-token', 'raw-nonce');
    });

    it('saves the first-sign-in name to Supabase metadata and the profile', async () => {
      const { repo, apple, api, profiles } = setup();
      apple.signIn.mockResolvedValueOnce({ identityToken: 't', fullName: 'Faiz Ahmad' });
      api.signInWithIdToken.mockResolvedValueOnce(testUser({ provider: 'apple', displayName: null }));
      const user = await repo.signInWithApple();
      expect(user.displayName).toBe('Faiz Ahmad');
      expect(api.updateFullName).toHaveBeenCalledWith('Faiz Ahmad');
      expect(profiles.updateDisplayName).toHaveBeenCalledWith('user-1', 'Faiz Ahmad');
    });

    it('propagates Cancelled without calling Supabase', async () => {
      const { repo, apple, api } = setup();
      apple.signIn.mockRejectedValueOnce(new AuthError('Cancelled'));
      await expect(repo.signInWithApple()).rejects.toMatchObject({ code: 'Cancelled' });
      expect(api.signInWithIdToken).not.toHaveBeenCalled();
    });

    it('surfaces Supabase network failures as Network', async () => {
      const { repo, api } = setup();
      api.signInWithIdToken.mockRejectedValueOnce(new AuthError('Network'));
      await expect(repo.signInWithApple()).rejects.toMatchObject({ code: 'Network' });
    });
  });

  describe('Google', () => {
    it('exchanges the Google ID token and persists the profile', async () => {
      const { repo, api, profiles, appMeta } = setup();
      const user = await repo.signInWithGoogle();
      expect(api.signInWithIdToken).toHaveBeenCalledWith('google', 'google-id-token');
      expect(profiles.saveFromAuth).toHaveBeenCalledWith(user);
      expect(appMeta.data.get('last_user_id')).toBe(user.id);
    });

    it.each(['Cancelled', 'Network', 'ProviderUnavailable'] as const)('propagates %s', async (code) => {
      const { repo, google } = setup();
      google.signIn.mockRejectedValueOnce(new AuthError(code));
      await expect(repo.signInWithGoogle()).rejects.toMatchObject({ code });
    });
  });

  describe('Email OTP', () => {
    it('normalises the address and verifies the code', async () => {
      const { repo, api } = setup();
      await repo.requestEmailOtp('  Person@Example.COM ');
      expect(api.requestEmailOtp).toHaveBeenCalledWith('person@example.com');
      await repo.verifyEmailOtp('Person@Example.com', '123456');
      expect(api.verifyEmailOtp).toHaveBeenCalledWith('person@example.com', '123456');
    });

    it('rejects malformed input before any network call', async () => {
      const { repo, api } = setup();
      await expect(repo.requestEmailOtp('not-an-email')).rejects.toBeInstanceOf(AuthError);
      await expect(repo.verifyEmailOtp('a@b.co', '12a')).rejects.toMatchObject({ code: 'InvalidOtp' });
      expect(api.requestEmailOtp).not.toHaveBeenCalled();
      expect(api.verifyEmailOtp).not.toHaveBeenCalled();
    });

    it('propagates wrong codes and network failures', async () => {
      const { repo, api } = setup();
      api.verifyEmailOtp.mockRejectedValueOnce(new AuthError('InvalidOtp'));
      await expect(repo.verifyEmailOtp('a@b.co', '000000')).rejects.toMatchObject({ code: 'InvalidOtp' });
      api.requestEmailOtp.mockRejectedValueOnce(new AuthError('Network'));
      await expect(repo.requestEmailOtp('a@b.co')).rejects.toMatchObject({ code: 'Network' });
    });
  });

  describe('Guest', () => {
    it('creates a guest fully offline and reuses the same id later', async () => {
      const { repo, api, profiles, appMeta } = setup();
      const first = await repo.continueAsGuest();
      expect(first).toMatchObject({ id: 'new-guest-id', provider: 'guest' });
      expect(profiles.ensureGuest).toHaveBeenCalledWith('new-guest-id');
      expect(appMeta.data.get('guest_active')).toBe('1');

      await repo.signOut();
      expect(api.signOut).not.toHaveBeenCalled();
      expect(appMeta.data.get('guest_id')).toBe('new-guest-id');
      await expect(repo.restoreSession()).resolves.toBeNull();

      appMeta.data.set('guest_id', 'existing-guest');
      await expect(repo.continueAsGuest()).resolves.toMatchObject({ id: 'existing-guest' });
    });

    it('hands guest data to the account on a real sign-in', async () => {
      const { repo, guestData, appMeta } = setup();
      await repo.continueAsGuest();
      const user = await repo.signInWithGoogle();
      expect(guestData.reassignGuestData).toHaveBeenCalledWith('new-guest-id', user.id, 'NOW');
      expect(appMeta.data.has('guest_active')).toBe(false);
    });
  });

  describe('restoreSession', () => {
    it('restores a Supabase session and refreshes the local profile', async () => {
      const { repo, api, profiles } = setup();
      api.getSessionUser.mockResolvedValueOnce(testUser());
      await expect(repo.restoreSession()).resolves.toMatchObject({ id: 'user-1' });
      expect(profiles.saveFromAuth).toHaveBeenCalled();
    });

    it('keeps the last user signed in while offline', async () => {
      const { repo, api, profiles, appMeta } = setup();
      appMeta.data.set('last_user_id', 'user-1');
      profiles.getLocal.mockResolvedValueOnce(testProfile({ provider: 'apple' }));
      api.getSessionUser.mockRejectedValueOnce(new AuthError('Network'));
      await expect(repo.restoreSession()).resolves.toMatchObject({ id: 'user-1', provider: 'apple' });
    });

    it('restores an active guest', async () => {
      const { repo, appMeta } = setup();
      appMeta.data.set('guest_id', 'g-1');
      appMeta.data.set('guest_active', '1');
      await expect(repo.restoreSession()).resolves.toMatchObject({ id: 'g-1', provider: 'guest' });
    });
  });

  it('signing out a real user clears Google and the Supabase session', async () => {
    const { repo, api, google, appMeta } = setup();
    await repo.signInWithGoogle();
    await repo.signOut();
    expect(google.signOut).toHaveBeenCalled();
    expect(api.signOut).toHaveBeenCalled();
    expect(appMeta.data.has('last_user_id')).toBe(false);
  });
});
