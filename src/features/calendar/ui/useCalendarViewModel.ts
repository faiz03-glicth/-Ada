import { useCallback, useMemo, useState } from 'react';

import { countOn } from '@/features/checkins/domain/checkInIndex';
import { summarize } from '@/features/checkins/domain/stats';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import {
  buildMonthCalendar,
  buildMonthGrid,
  monthAccessibilityLabel,
} from '@/features/heatmap/domain/calendarGrid';
import { goBack, openDay, type HeatmapOptions, type HeatmapView } from '@/shared/actions';
import {
  addMonths,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  monthLong,
  monthOf,
  monthShort,
  weekdayLetters,
  type YearMonth,
} from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { checkInCount } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { useCalendarPreferencesStore } from '@/shared/state/calendarPreferencesStore';
import type { HeatmapMonth } from '@/shared/ui';

import { useOpenMonth } from '../hooks/useOpenMonth';

export const VIEW_OPTIONS = [
  { value: 'year', label: 'Year' },
  { value: 'month', label: 'Month' },
] as const satisfies readonly { value: HeatmapView; label: string }[];

const QUARTERS = [0, 3, 6, 9] as const;

/**
 * The full heatmap: a year stacked as four quarters (no sideways scrolling), or one month as day tiles.
 * Which year/month is shown is this screen's own state (opened at the params' year and month); stepping
 * back and forth never goes past the current month.
 */
export function useCalendarViewModel(options: HeatmapOptions) {
  const today = useToday();
  const current = monthOf(today);
  const { index } = useCheckIns();
  const openMonth = useOpenMonth();
  const weekStart = useCalendarPreferencesStore((s) => s.weekStart);
  const outlineToday = useCalendarPreferencesStore((s) => s.outlineToday);

  const [view, setView] = useState<HeatmapView>(options.view ?? 'year');
  const [shown, setShown] = useState<YearMonth>(() => {
    const year = Math.min(options.year ?? current.year, current.year);
    const month = options.month !== undefined ? options.month - 1 : year === current.year ? current.month : 0;
    return year === current.year ? { year, month: Math.min(month, current.month) } : { year, month };
  });

  const dayOptions = useMemo(
    () => ({ countOn: (day: ISODate) => countOn(index, day), today, weekStart, outlineToday }),
    [index, today, weekStart, outlineToday],
  );

  const quarters = useMemo<HeatmapMonth[][]>(
    () =>
      QUARTERS.map((first) =>
        [first, first + 1, first + 2].map((month) => ({
          key: `${shown.year}-${month}`,
          label: monthShort(month),
          grid: buildMonthGrid({ year: shown.year, month }, dayOptions),
          value: { year: shown.year, month },
          accessibilityLabel: monthAccessibilityLabel({ year: shown.year, month }, dayOptions),
        })),
      ),
    [shown.year, dayOptions],
  );

  const yearStats = useMemo(() => {
    const summary = summarize(
      index,
      firstOfMonth({ year: shown.year, month: 0 }),
      lastOfMonth({ year: shown.year, month: 11 }),
      today,
    );
    let best: { month: number; total: number } | null = null;
    for (let month = 0; month < 12; month += 1) {
      const first = firstOfMonth({ year: shown.year, month });
      if (first > today) break;
      const { total } = summarize(index, first, lastOfMonth({ year: shown.year, month }), today);
      if (total > 0 && (!best || total > best.total)) best = { month, total };
    }
    return { ...summary, bestMonth: best ? monthShort(best.month) : '—' };
  }, [index, shown.year, today]);

  const monthRows = useMemo(() => buildMonthCalendar(shown, dayOptions), [shown, dayOptions]);
  const monthStats = useMemo(() => {
    const summary = summarize(index, firstOfMonth(shown), lastOfMonth(shown), today);
    let busiest: { day: number; count: number } | null = null;
    for (const day of eachDay(firstOfMonth(shown), lastOfMonth(shown))) {
      const count = countOn(index, day);
      if (count > 0 && (!busiest || count > busiest.count)) busiest = { day: Number(day.slice(8)), count };
    }
    return {
      ...summary,
      busiest: busiest ? `${monthShort(shown.month)} ${busiest.day} · ${checkInCount(busiest.count)}` : '—',
    };
  }, [index, shown, today]);

  const atLatest =
    view === 'year'
      ? shown.year >= current.year
      : shown.year === current.year && shown.month >= current.month;

  const step = (by: number) => {
    setShown((from) => {
      if (view === 'year') {
        const year = Math.min(current.year, from.year + by);
        return { year, month: year === current.year ? Math.min(from.month, current.month) : from.month };
      }
      const next = addMonths(from, by);
      return firstOfMonth(next) > today ? from : next;
    });
  };

  const onDayPress = useCallback((day: string) => {
    haptics.selection();
    openDay(day as ISODate);
  }, []);

  return {
    view,
    viewOptions: VIEW_OPTIONS,
    /** Where the shown period sits in time, for the direction of its transition. */
    position: view === 'year' ? shown.year : shown.year * 12 + shown.month,
    title: view === 'year' ? String(shown.year) : `${monthLong(shown.month)} ${shown.year}`,
    canGoNext: !atLatest,
    dayLabels: weekdayLetters(weekStart),
    quarters,
    yearStats,
    monthRows,
    monthStats,

    onView: (next: HeatmapView) => {
      haptics.selection();
      setView(next);
    },
    onPrevious: () => step(-1),
    onNext: () => step(1),
    onDayPress,
    onMonthPress: ({ value }: HeatmapMonth) => openMonth(value),
    onBack: () => goBack(),
  };
}

export type CalendarViewModel = ReturnType<typeof useCalendarViewModel>;
