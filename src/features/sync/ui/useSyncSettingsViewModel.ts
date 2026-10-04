import { useAuthStore } from '@/features/auth/state/authStore';
import { haptics } from '@/shared/lib/haptics';

import { syncDescription } from '../domain/syncStatus';
import { useSyncPreferencesStore } from '../state/syncPreferencesStore';
import { useSyncStatusStore } from '../state/syncStatusStore';

/** The Sync row in Data & privacy: a switch for signed-in accounts, with what sync is doing under it. */
export function useSyncSettingsViewModel() {
  const member = useAuthStore((s) => s.status === 'signedIn');
  const enabled = useSyncPreferencesStore((s) => s.enabled);
  const setEnabled = useSyncPreferencesStore((s) => s.setEnabled);
  const status = useSyncStatusStore((s) => s.status);

  return {
    /** Guests have no account to sync with: the row explains instead of offering a switch. */
    canSync: member,
    enabled,
    description: syncDescription({ member, enabled, status }),
    onToggle: (on: boolean) => {
      haptics.selection();
      setEnabled(on);
    },
  };
}
