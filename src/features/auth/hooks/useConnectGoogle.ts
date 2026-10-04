import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/core/DiProvider';
import { checkInsQueryKey } from '@/features/checkins/hooks/useCheckIns';
import { profileQueryKey } from '@/features/profile/hooks/useProfile';
import { useSyncPreferencesStore } from '@/features/sync/state/syncPreferencesStore';
import { haptics } from '@/shared/lib/haptics';
import { showInfo, showSuccess } from '@/shared/ui/toast';

import { AuthError } from '../domain/AuthError';
import { feedbackFor } from '../domain/authFeedback';
import { useAuthStore } from '../state/authStore';

/**
 * Connect Google, for a guest: Google's sign-in sheet, then the guest's check-ins become the account's and
 * the app carries on as that account on the same screen (the route guards keep a set-up person in the
 * app). Sync then uploads the check-ins in the background, a batch at a time.
 */
export function useConnectGoogle() {
  const { auth } = useRepositories();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  const mutation = useMutation({
    mutationFn: () => auth.connectGoogle(),
    retry: false,
    onSuccess: (user) => {
      setUser(user);
      // The check-ins are read again under the account's id; the guest's copy is gone.
      queryClient.removeQueries({ queryKey: checkInsQueryKey(null) });
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(user.id) });
      haptics.success();
      showSuccess({
        title: 'Google account connected',
        sub: useSyncPreferencesStore.getState().enabled
          ? 'Your check-ins are being backed up to it.'
          : 'Turn on Sync in Data & privacy to back up your check-ins.',
      });
    },
    onError: (error) => {
      const { banner } = feedbackFor(error);
      // Cancelling the Google sheet is silent.
      if (!banner) return;
      haptics.error();
      showInfo({ title: "Couldn't connect Google", sub: banner });
      if (!(error instanceof AuthError) || error.code === 'Unknown') {
        // Never logs tokens or addresses: only the error kind.
        console.error(`[auth] Connect Google failed (${error instanceof Error ? error.name : 'unknown'})`); // TODO(Sentry)
      }
    },
  });

  return {
    // One Google sheet at a time, however often the row is tapped.
    connect: () => {
      if (!mutation.isPending) mutation.mutate();
    },
    connecting: mutation.isPending,
  };
}
