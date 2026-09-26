import { useCallback, useMemo, useState } from 'react';

import { useAuthStore } from '@/features/auth/state/authStore';
import { checkInsOn, countOn } from '@/features/checkins/domain/checkInIndex';
import { currentStreak, summarize, trend, type TrendRange } from '@/features/checkins/domain/stats';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { useCheckInFeedbackStore } from '@/features/checkins/state/checkInFeedbackStore';
import { buildMonthGrid, monthAccessibilityLabel } from '@/features/heatmap/domain/calendarGrid';
import { profileTitle } from '@/features/profile/domain/Profile';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { goTab, openCheckIn, openDay, openDayPicker, openHeatmap } from '@/shared/actions';
import {
  addDays,
  addMonths,
  firstOfMonth,
  lastOfMonth,
  monthOf,
  monthShort,
  startOfWeek,
  weekdayLetters,
} from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { longDate } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { useCalendarPreferencesStore } from '@/shared/state/calendarPreferencesStore';
import type { HeatmapMonth } from '@/shared/ui';

/** How many months the Home heatmap shows at once. */
export const HOME_MONTHS = 3;

export const TREND_OPTIONS = [
  { value: 'D', label: 'D' },
  { value: 'W', label: 'W' },
  { value: 'M', label: 'M' },
] as const satisfies readonly { value: TrendRange; label: string }[];

/**
 * Home: the heatmap first, then the numbers that support it (streak, active days, this week), the trend,
 * and today's check-ins. Everything is derived from the one check-in index; the only state of its own is
 * which months are shown and the trend's range.
 */
export function useHomeViewModel() {
  const { index, loading } = useCheckIns();
  const today = useToday();
  const weekStart = useCalendarPreferencesStore((s) => s.weekStart);
  const showLegend = useCalendarPreferencesStore((s) => s.showLegend);
  const outlineToday = useCalendarPreferencesStore((s) => s.outlineToday);
  const pulseDay = useCheckInFeedbackStore((s) => s.pulseDay);
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user);

  // How many months back from the current one the heatmap is showing (0 = ending this month).
  const [monthsBack, setMonthsBack] = useState(0);
  const [trendRange, setTrendRange] = useState<TrendRange>('W');

  const months = useMemo(() => {
    const end = addMonths(monthOf(today), -monthsBack);
    return Array.from({ length: HOME_MONTHS }, (_, i) => addMonths(end, i - (HOME_MONTHS - 1)));
  }, [today, monthsBack]);

  const heatmap = useMemo<HeatmapMonth[]>(() => {
    const options = { countOn: (day: ISODate) => countOn(index, day), today, weekStart, outlineToday };
    return months.map((month) => ({
      key: `${month.year}-${month.month}`,
      label: monthShort(month.month),
      grid: buildMonthGrid(month, options),
      value: month,
      accessibilityLabel: monthAccessibilityLabel(month, options),
    }));
  }, [index, months, today, weekStart, outlineToday]);

  const first = months[0] ?? monthOf(today);
  const last = months[months.length - 1] ?? monthOf(today);
  const period = useMemo(
    () => summarize(index, firstOfMonth(first), lastOfMonth(last), today),
    [index, first, last, today],
  );
  const stats = useMemo(
    () => ({
      streak: currentStreak(index, today),
      thisWeek: summarize(index, startOfWeek(today, weekStart), today, today).total,
    }),
    [index, today, weekStart],
  );
  const trendData = useMemo(
    () => trend(index, trendRange, today, weekStart),
    [index, trendRange, today, weekStart],
  );
  const todayCheckIns = checkInsOn(index, today);
  // The trend means something once there's a week to compare: until then its card says when it will.
  const firstDay = index.days[index.days.length - 1];
  const trendReady = firstDay !== undefined && firstDay <= addDays(today, -7);

  const name = profile ?? user;
  const onMonthPress = useCallback(
    ({ value }: HeatmapMonth) => openDayPicker({ year: value.year, month: value.month + 1 }),
    [],
  );

  return {
    loading,
    empty: !loading && index.total === 0,
    dateLine: longDate(today),
    avatarName: name && user?.provider !== 'guest' ? profileTitle(name) : null,
    avatarUrl: profile?.avatarUrl ?? user?.avatarUrl ?? null,
    today,

    heatmap,
    /** Moving by months: which way the heatmap last moved, for its transition. */
    monthsBack,
    dayLabels: weekdayLetters(weekStart),
    periodYear: last.year,
    periodRange: `${monthShort(first.month)} – ${monthShort(last.month)}`,
    periodTotal: period.total,
    canGoNewer: monthsBack > 0,
    showLegend,
    pulseDay,
    todayCount: todayCheckIns.length,

    streak: stats.streak,
    activeDays: period.activeDays,
    periodDays: period.days,
    thisWeek: stats.thisWeek,

    trendRange,
    trendOptions: TREND_OPTIONS,
    trend: trendData,
    trendReady,

    /** Today's latest check-ins, newest first (Home shows a few; History has them all). */
    todayList: todayCheckIns.slice(-4).reverse(),

    onOlder: () => setMonthsBack((back) => back + 1),
    onNewer: () => setMonthsBack((back) => Math.max(0, back - 1)),
    onTrendRange: (range: TrendRange) => {
      haptics.selection();
      setTrendRange(range);
    },
    onMonthPress,
    onToday: () => openDay(today),
    onOpenCalendar: () => openHeatmap({ view: 'year', year: last.year }),
    onProfile: () => goTab('profile'),
    onSeeAll: () => goTab('history'),
    onFirstCheckIn: () => openCheckIn(),
  };
}

export type HomeViewModel = ReturnType<typeof useHomeViewModel>;
