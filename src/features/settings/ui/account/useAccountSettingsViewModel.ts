import { Alert } from 'react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { profileTitle } from '@/features/profile/domain/Profile';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { goBack, openEditField, openHelpCenter } from '@/shared/actions';
import { useSessionActions } from '@/shared/actions/session';
import { deviceTimeZone } from '@/shared/lib/date/deviceTimeZone';
import { haptics } from '@/shared/lib/haptics';

export const PROVIDER_LABEL = {
  apple: 'Apple',
  google: 'Google',
  email: 'Email code',
  guest: 'Guest',
} as const;

/**
 * Account: who you are and how you sign in. Only what works is offered as working: the name can be
 * edited; connecting another provider and deleting the account aren't available in the app yet, and
 * say what to do instead.
 */
export function useAccountSettingsViewModel() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user);
  const { linkProvider } = useSessionActions();
  const provider = user?.provider ?? 'guest';
  const identity = profile ?? user;
  const name = identity ? profileTitle(identity) : 'Guest';

  return {
    isGuest: provider === 'guest',
    provider,
    providerLabel: PROVIDER_LABEL[provider],
    name,
    avatarUrl: profile?.avatarUrl ?? user?.avatarUrl ?? null,
    username: profile?.username ? `@${profile.username}` : 'Not set',
    email: profile?.email ?? user?.email ?? '—',
    timeZone: profile?.timeZone ?? deviceTimeZone(),

    onEditName: () => openEditField('name'),
    onConnect: (which: 'apple' | 'google') => linkProvider(which),
    onDelete: () => {
      haptics.warning();
      Alert.alert(
        'Delete your account',
        "Deleting an account isn't available in the app yet. Contact us through the help center and we'll delete it and your check-ins for you.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open help center', onPress: () => void openHelpCenter() },
        ],
      );
    },
    onBack: () => goBack(),
  };
}
