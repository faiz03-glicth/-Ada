import { useCallback } from 'react';

import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { openDay } from '@/shared/actions';
import type { YearMonth } from '@/shared/lib/date/calendar';
import { useToday } from '@/shared/lib/date/useToday';

import { openingDay } from '../domain/openingDay';
import { chosenDayMemory } from '../state/chosenDayMemory';

/** A month chosen on a heatmap: the Day sheet, on the day that month opens on (see openingDay). */
export function useOpenMonth(): (month: YearMonth) => void {
  const today = useToday();
  const { index } = useCheckIns();
  return useCallback(
    (month: YearMonth) => openDay(openingDay(month, today, index, chosenDayMemory.get(month))),
    [today, index],
  );
}
