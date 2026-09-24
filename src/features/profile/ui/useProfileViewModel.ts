import { useAuthStore } from '@/features/auth/state/authStore';
import { openSettings } from '@/shared/actions';
import { useSessionActions } from '@/shared/actions/session';

import { profileTitle } from '../domain/Profile';
import { useProfile } from '../hooks/useProfile';

/** Phase 1 placeholder: who is signed in, Appearance, and Log out. The full Profile arrives in Phase 4. */
export function useProfileViewModel() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user);
  const { signOut } = useSessionActions();

  const isGuest = user?.provider === 'guest';
  const identity = profile ?? user;
  const name = identity ? profileTitle(identity) : 'Guest';

  return {
    name,
    avatarName: isGuest ? null : name,
    avatarUrl: profile?.avatarUrl ?? user?.avatarUrl ?? null,
    detail: isGuest ? 'Your check-ins are stored on this device' : (profile?.email ?? user?.email ?? null),
    onAppearance: () => openSettings('appearance'),
    onLogOut: () => void signOut(),
  };
}
