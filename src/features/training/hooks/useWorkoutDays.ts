import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';
import { useSyncPreferencesStore } from '@/features/sync/state/syncPreferencesStore';
import type { ISODate } from '@/shared/lib/date/isoDate';

export const workoutDaysQueryKey = (userId: string) => ['workoutDays', userId] as const;

const NONE: ReadonlySet<ISODate> = new Set();
const toSet = (days: ISODate[]): ReadonlySet<ISODate> => new Set(days);

/**
 * The days the signed-in account worked out in Teras (dates only), read from the phone; sync refreshes them
 * when a pull changes something. Guests have none, and nobody does while Sync is off.
 */
export function useWorkoutDays(): ReadonlySet<ISODate> {
  const { training } = useRepositories();
  const userId = useAuthStore((s) => (s.status === 'signedIn' ? (s.user?.id ?? null) : null));
  const syncOn = useSyncPreferencesStore((s) => s.enabled);
  const shown = userId !== null && syncOn;
  const query = useQuery({
    queryKey: workoutDaysQueryKey(userId ?? ''),
    queryFn: () => training.listWorkoutDays(userId ?? ''),
    enabled: shown,
    networkMode: 'always',
    // Read from the phone, and refreshed by sync whenever a pull changes it: never stale.
    staleTime: Infinity,
    select: toSet,
  });
  // A switched-off query still hands back what it had, so it's hidden here.
  return shown ? (query.data ?? NONE) : NONE;
}
