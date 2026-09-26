import { useMemo } from 'react';

import { openCheckIn } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { useCheckInActions } from './useCheckInActions';

/**
 * The + button. A tap opens the check-in sheet (a light tap you can feel). Holding it repeats the last
 * check-in right away: a firmer tap when the hold is recognised, then, only once it's saved, the success
 * haptic and a toast with Undo. With nothing to repeat yet, the hold just opens the sheet.
 */
export function useFabActions() {
  const actions = useCheckInActions();
  return useMemo(
    () => ({
      onPress: () => {
        haptics.light();
        openCheckIn();
      },
      onLongPress: async () => {
        haptics.medium();
        const result = await actions.repeatLast();
        if (result === null) openCheckIn();
        else if (result.ok) actions.announce(result.checkIn);
        else showInfo({ title: "Couldn't repeat your check-in", sub: result.message });
      },
    }),
    [actions],
  );
}
