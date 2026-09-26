import { useMemo, useState } from 'react';

import { countOn } from '@/features/checkins/domain/checkInIndex';
import { bestStreak, currentStreak } from '@/features/checkins/domain/stats';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { weekdayLong, weekdayOrder, weekdayShort } from '@/shared/lib/date/calendar';
import { useToday } from '@/shared/lib/date/useToday';
import { haptics } from '@/shared/lib/haptics';
import { useCalendarPreferencesStore } from '@/shared/state/calendarPreferencesStore';

import {
  DAYS_FOR_INSIGHTS,
  insightTip,
  patterns,
  rangeInsights,
  TIMES_OF_DAY,
  type InsightsRange,
  type TimeOfDay,
} from '../domain/insights';

export const RANGE_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const satisfies readonly { value: InsightsRange; label: string }[];

const RANGE_NAME: Record<InsightsRange, string> = {
  week: 'this week',
  month: 'this month',
  year: 'this year',
};

export const TIME_OF_DAY_COPY: Record<TimeOfDay, { name: string; hours: string }> = {
  morning: { name: 'Morning', hours: 'before 12 PM' },
  afternoon: { name: 'Afternoon', hours: '12 – 5 PM' },
  evening: { name: 'Evening', hours: '5 – 9 PM' },
  night: { name: 'Night', hours: 'after 9 PM' },
};

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Insights in plain words ("Tuesday is when you check in most"). Nothing is shown until there's enough to
 * mean something (check-ins on 7 different days); until then, progress toward it. All numbers come from
 * the shared index, recomputed only when the check-ins, the range or today change.
 */
export function useInsightsViewModel() {
  const { index, loading } = useCheckIns();
  const today = useToday();
  const weekStart = useCalendarPreferencesStore((s) => s.weekStart);
  const [range, setRange] = useState<InsightsRange>('month');

  const summary = useMemo(
    () => rangeInsights(index, range, today, weekStart),
    [index, range, today, weekStart],
  );
  const found = useMemo(() => patterns(index, today), [index, today]);
  const streaks = useMemo(
    () => ({ current: currentStreak(index, today), best: bestStreak(index) }),
    [index, today],
  );

  const busiestTime = Math.max(...TIMES_OF_DAY.map((time) => found.byTimeOfDay[time]));
  const busiestWeekday = Math.max(...found.byWeekday);

  return {
    loading,
    ready: index.days.length >= DAYS_FOR_INSIGHTS,
    progressDays: Math.min(index.days.length, DAYS_FOR_INSIGHTS),
    daysNeeded: DAYS_FOR_INSIGHTS,

    range,
    rangeOptions: RANGE_OPTIONS,
    rangeName: RANGE_NAME[range],
    summary,
    deltaUp: summary.deltaPercent >= 0,
    activePercentOfRange: percent(summary.activeDays, summary.days),
    streaks,

    consistency: { activePercent: found.activePercent, daysByLevel: found.daysByLevel },
    bestWeekday: weekdayLong(found.bestWeekday),
    weekdays: weekdayOrder(weekStart).map((weekday) => ({
      key: weekday,
      label: weekdayShort(weekday).slice(0, 2),
      value: found.byWeekday[weekday] ?? 0,
      best: weekday === found.bestWeekday && busiestWeekday > 0,
    })),
    timesOfDay: TIMES_OF_DAY.map((time) => ({
      key: time,
      ...TIME_OF_DAY_COPY[time],
      share: percent(found.byTimeOfDay[time], found.total),
      fill: busiestTime ? found.byTimeOfDay[time] / busiestTime : 0,
      top: busiestTime > 0 && found.byTimeOfDay[time] === busiestTime,
    })),
    byActivity: found.byActivity.map(({ activity, count }) => ({
      activity,
      count,
      share: percent(count, found.total),
    })),
    tip: insightTip(streaks.current, countOn(index, today)),

    onRange: (next: InsightsRange) => {
      haptics.selection();
      setRange(next);
    },
  };
}

export type InsightsViewModel = ReturnType<typeof useInsightsViewModel>;
