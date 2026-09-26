import { useQuery } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import { useAuthStore } from '@/features/auth/state/authStore';

import type { CheckInOwner } from '../data/CheckInRepository';
import type { CheckIn } from '../domain/CheckIn';
import { indexCheckIns, type CheckInIndex } from '../domain/checkInIndex';

export const checkInsQueryKey = (owner: CheckInOwner) => ['checkIns', owner ?? 'guest'] as const;

/** Whose check-ins the app shows: the signed-in user's, the guest's (null), or nobody's (undefined). */
export function useCheckInOwner(): CheckInOwner | undefined {
  return useAuthStore((s) => (s.user ? (s.user.provider === 'guest' ? null : s.user.id) : undefined));
}

const NONE: readonly CheckIn[] = [];

/**
 * The person's check-ins, read once from the device and then kept in the query cache: writes update the
 * cache directly (see useCheckInActions), so every screen changes the moment something is saved, with no
 * reload. Every screen gets the SAME index for the same data (indexCheckIns is memoised per list), so the
 * derived numbers are computed once per change, not once per screen.
 */
export function useCheckIns(): { index: CheckInIndex; loading: boolean; failed: boolean } {
  const { checkIns } = useRepositories();
  const owner = useCheckInOwner();
  const query = useQuery({
    queryKey: checkInsQueryKey(owner ?? null),
    queryFn: () => checkIns.list(owner ?? null),
    enabled: owner !== undefined,
    networkMode: 'always',
    // The device is the source of truth and every write lands in the cache: it's never stale.
    staleTime: Infinity,
  });
  return {
    index: indexCheckIns(query.data ?? NONE),
    loading: query.isPending && owner !== undefined,
    failed: query.isError,
  };
}
