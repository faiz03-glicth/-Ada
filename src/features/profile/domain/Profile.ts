import type { AuthProvider } from '@/features/auth/domain/types';

export interface Profile {
  id: string;
  /** Null for the local guest profile. */
  userId: string | null;
  email: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
}

/** PURE: what to call someone on screen. */
export function profileTitle(profile: Pick<Profile, 'displayName' | 'email' | 'provider'>): string {
  if (profile.provider === 'guest') return 'Guest';
  return profile.displayName?.trim() || profile.email || 'Streak member';
}
