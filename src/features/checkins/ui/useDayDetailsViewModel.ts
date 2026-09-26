import { useMemo } from 'react';

import { INTENSITY_LEVELS, intensityLevel } from '@/features/heatmap/domain/intensity';
import { goBack, openCheckIn, showDay } from '@/shared/actions';
import { addDays, fromISODate, startOfWeek, weekdayShort } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { dayLabel, longDate, shortDate } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { useCalendarPreferencesStore } from '@/shared/state/calendarPreferencesStore';

import type { CheckIn } from '../domain/CheckIn';
import { checkInsOn, countOn } from '../domain/checkInIndex';
import { useCheckInActions } from '../hooks/useCheckInActions';
import { useCheckIns } from '../hooks/useCheckIns';

/**
 * Day details: one day's count and intensity, its week (a strip to step between days in place), the
 * timeline of check-ins, and adding one to this day. Switching day only changes the sheet's date param,
 * so nothing else in the app re-renders.
 */
export function useDayDetailsViewModel(date: ISODate | null) {
  const today = useToday();
  const day = date && date <= today ? date : today;
  const weekStart = useCalendarPreferencesStore((s) => s.weekStart);
  const { index } = useCheckIns();
  const actions = useCheckInActions();

  const checkIns = checkInsOn(index, day);
  const count = checkIns.length;
  const level = intensityLevel(count);
  const info = INTENSITY_LEVELS[level];

  const strip = useMemo(() => {
    const first = startOfWeek(day, weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const stripDay = addDays(first, i);
      const future = stripDay > today;
      const dayCount = countOn(index, stripDay);
      return {
        day: stripDay,
        letter: weekdayShort(fromISODate(stripDay).getDay()).slice(0, 1),
        date: fromISODate(stripDay).getDate(),
        level: intensityLevel(dayCount),
        future,
        selected: stripDay === day,
        label: `${shortDate(stripDay)}: ${future ? 'upcoming' : `${dayCount} check-in${dayCount === 1 ? '' : 's'}`}`,
      };
    });
  }, [day, weekStart, today, index]);

  return {
    day,
    eyebrow: dayLabel(day, today),
    title: longDate(day),
    count,
    level,
    levelLabel: `${info.name} · ${info.rangeLabel}`,
    strip,
    checkIns,

    onSelectDay: (next: ISODate) => {
      if (next === day || next > today) return;
      haptics.selection();
      showDay(next);
    },
    onAdd: () => openCheckIn({ date: day }),
    onOptions: (checkIn: CheckIn) => void actions.remove(checkIn),
    onClose: () => goBack(),
  };
}

export type DayDetailsViewModel = ReturnType<typeof useDayDetailsViewModel>;
