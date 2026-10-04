import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useRepositories } from '@/core/DiProvider';
import { checkInsQueryKey } from '@/features/checkins/hooks/useCheckIns';
import { requestSync } from '@/features/sync/state/syncRequests';
import { confirm } from '@/shared/lib/confirm';
import { checkInCount } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { showInfo, showSuccess } from '@/shared/ui/toast';

import type { AuthUser } from '../domain/types';

/**
 * After a plain sign-in: if a logged-out guest left check-ins on this phone, ask before they join the
 * account. They never move silently (they may be someone else's); "Keep separate" leaves them in guest
 * mode, where "Continue as guest" picks them up again.
 */
export function useGuestDataOffer(): (user: AuthUser) => Promise<void> {
  const { auth } = useRepositories();
  const queryClient = useQueryClient();

  return useCallback(
    async (user: AuthUser) => {
      if (user.provider === 'guest') return;
      let count: number;
      try {
        count = await auth.guestCheckInsOnDevice();
      } catch {
        return;
      }
      if (!count) return;
      const add = await confirm({
        title: 'Add guest check-ins?',
        message: `This phone has ${checkInCount(count)} from guest mode. Add them to this account? Kept separate, they stay in guest mode on this phone.`,
        confirmLabel: 'Add to account',
        cancelLabel: 'Keep separate',
      });
      if (!add) return;
      try {
        await auth.claimGuestData(user.id);
      } catch {
        haptics.error();
        showInfo({ title: "Couldn't add them", sub: 'They are still in guest mode on this phone.' });
        return;
      }
      queryClient.removeQueries({ queryKey: checkInsQueryKey(null) });
      await queryClient.invalidateQueries({ queryKey: checkInsQueryKey(user.id) });
      requestSync();
      haptics.success();
      showSuccess({ title: 'Guest check-ins added', sub: `${checkInCount(count)} added to your account.` });
    },
    [auth, queryClient],
  );
}
