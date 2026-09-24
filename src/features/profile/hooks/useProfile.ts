import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import type { AuthUser } from '@/features/auth/domain/types';

import type { Profile } from '../domain/Profile';

export const profileQueryKey = (userId: string) => ['profile', userId] as const;

/**
 * Local-first: returns the SQLite row immediately, then (online, signed-in users only) refreshes it
 * from Supabase, writes the result back to SQLite and updates the cached value.
 */
export function useProfile(user: AuthUser | null) {
  const { profile } = useRepositories();
  const queryClient = useQueryClient();
  const userId = user?.id ?? '';

  const local = useQuery<Profile | null>({
    queryKey: profileQueryKey(userId),
    queryFn: () => profile.getLocal(userId),
    enabled: user !== null,
    networkMode: 'always',
  });

  useQuery<Profile | null>({
    queryKey: [...profileQueryKey(userId), 'remote'],
    queryFn: async () => {
      const fresh = await profile.refreshFromRemote(userId);
      if (fresh) queryClient.setQueryData(profileQueryKey(userId), fresh);
      return fresh;
    },
    enabled: user !== null && user.provider !== 'guest',
    networkMode: 'online',
  });

  return local;
}
