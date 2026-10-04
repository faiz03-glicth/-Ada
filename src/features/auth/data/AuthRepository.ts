import type { AuthUser } from '../domain/types';

/** Single source of truth for who is signed in. Every method rejects with an AuthError. */
export interface AuthRepository {
  /** iOS only; false on Android or devices without Sign in with Apple. */
  isAppleAvailable(): Promise<boolean>;
  signInWithApple(): Promise<AuthUser>;
  signInWithGoogle(): Promise<AuthUser>;
  requestEmailOtp(email: string): Promise<void>;
  verifyEmailOtp(email: string, code: string): Promise<AuthUser>;
  continueAsGuest(): Promise<AuthUser>;
  /** From inside a guest session: signs in with Google and the guest's check-ins become the account's. */
  connectGoogle(): Promise<AuthUser>;
  /** Check-ins a logged-out guest left on this phone (0 while a guest session is in progress). */
  guestCheckInsOnDevice(): Promise<number>;
  /** Gives those check-ins to the signed-in account (only when the person agrees). */
  claimGuestData(userId: string): Promise<void>;
  restoreSession(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  /** Fires with the signed-in Supabase user, or null when the remote session ends. Returns an unsubscribe. */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}
