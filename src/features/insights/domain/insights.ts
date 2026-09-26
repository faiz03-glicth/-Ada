import { ACTIVITIES } from '@/features/activities/domain/catalog';
import type { Activity } from '@/features/activities/domain/Activity';
import { checkInsOn, type CheckInIndex } from '@/features/checkins/domain/checkInIndex';
import { summarize } from '@/features/checkins/domain/stats';
import { intensityLevel, type IntensityLevel } from '@/features/heatmap/domain/intensity';
import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  monthOf,
  MONTHS_SHORT,
  startOfWeek,
  weekdayOf,
  weekdayShort,
  type WeekStart,
} from '@/shared/lib/date/calendar';
import { toISODate, type ISODate } from '@/shared/lib/date/isoDate';

/**
 * PURE: everything the Insights tab says, from the check-in index. Plain numbers only; the words live in
 * the screen's copy.
 */

export type InsightsRange = 'week' | 'month' | 'year';

/** Insights need this many different days with a check-in before patterns mean anything. */
export const DAYS_FOR_INSIGHTS = 7;
/** The window the pattern cards (consistency, best days, time of day, by activity) look at. */
export const PATTERN_DAYS = 90;

export interface RangeInsights {
  total: number;
  activeDays: number;
  days: number;
  /** Check-ins per day so far, to one decimal. */
  dailyAverage: number;
  /**
   * Compared with the same stretch of the period before (the first 3 days of last week against the first
   * 3 of this one), so a period that has only just begun isn't judged against a whole one. Whole percent;
   * 0 when the earlier stretch had nothing to compare against.
   */
  deltaPercent: number;
  /** The chart: one bar per day (week, month) or month (year); days after today are 0. */
  values: readonly number[];
  /** Axis labels, spread evenly under the chart. */
  labels: readonly string[];
}

function rangeStart(range: InsightsRange, today: ISODate, weekStart: WeekStart): ISODate {
  if (range === 'week') return startOfWeek(today, weekStart);
  if (range === 'month') return firstOfMonth(monthOf(today));
  return toISODate(new Date(monthOf(today).year, 0, 1));
}

/** The same stretch, one period earlier. */
function previousStretch(range: InsightsRange, start: ISODate, today: ISODate): [ISODate, ISODate] {
  const elapsed = daysBetween(start, today);
  if (range === 'week') {
    const from = addDays(start, -7);
    return [from, addDays(from, elapsed)];
  }
  if (range === 'month') {
    const previous = addMonths(monthOf(start), -1);
    const from = firstOfMonth(previous);
    // A longer month's extra days fold into the previous month's last day.
    return [from, addDays(from, Math.min(elapsed, daysInMonth(previous) - 1))];
  }
  const date = new Date(monthOf(today).year - 1, 0, 1);
  const from = toISODate(date);
  return [from, addDays(from, elapsed)];
}

export function rangeInsights(
  index: CheckInIndex,
  range: InsightsRange,
  today: ISODate,
  weekStart: WeekStart,
): RangeInsights {
  const start = rangeStart(range, today, weekStart);
  const current = summarize(index, start, today, today);
  const [from, to] = previousStretch(range, start, today);
  const previous = summarize(index, from, to, today);

  let values: number[];
  let labels: string[];
  if (range === 'week') {
    const days = eachDay(start, addDays(start, 6));
    values = days.map((day) => (day > today ? 0 : checkInsOn(index, day).length));
    labels = days.map((day) => weekdayShort(weekdayOf(day)).slice(0, 1));
  } else if (range === 'month') {
    const month = monthOf(today);
    const days = eachDay(start, lastOfMonth(month));
    values = days.map((day) => (day > today ? 0 : checkInsOn(index, day).length));
    labels = ['1', '8', '15', '22', String(days.length)];
  } else {
    const year = monthOf(today).year;
    values = Array.from({ length: 12 }, (_, month) => {
      const first = firstOfMonth({ year, month });
      return first > today ? 0 : summarize(index, first, lastOfMonth({ year, month }), today).total;
    });
    labels = MONTHS_SHORT.map((name) => name.slice(0, 1));
  }

  return {
    total: current.total,
    activeDays: current.activeDays,
    days: current.days,
    dailyAverage: Math.round((current.total / Math.max(1, current.days)) * 10) / 10,
    deltaPercent: previous.total ? Math.round(((current.total - previous.total) / previous.total) * 100) : 0,
    values,
    labels,
  };
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export const TIMES_OF_DAY: readonly TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

/** Before 12 PM, 12–5 PM, 5–9 PM, after 9 PM. */
export function timeOfDay(minute: number): TimeOfDay {
  if (minute < 12 * 60) return 'morning';
  if (minute < 17 * 60) return 'afternoon';
  if (minute < 21 * 60) return 'evening';
  return 'night';
}

export interface Patterns {
  /** Check-ins in the window. */
  total: number;
  /** Days in the window at each intensity level (0…4). */
  daysByLevel: readonly [number, number, number, number, number];
  /** Percent of the window's days with at least one check-in. */
  activePercent: number;
  /** Check-ins per weekday (0 = Sunday). */
  byWeekday: readonly number[];
  /** The weekday with the most check-ins (0 = Sunday). */
  bestWeekday: number;
  byTimeOfDay: Readonly<Record<TimeOfDay, number>>;
  /** Every activity with its check-ins, most first (ties keep the catalog's order). */
  byActivity: readonly { activity: Activity; count: number }[];
}

/** Patterns over the last PATTERN_DAYS days, today included. */
export function patterns(index: CheckInIndex, today: ISODate): Patterns {
  const daysByLevel: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const byTimeOfDay: Record<TimeOfDay, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const perActivity = new Map<string, number>();
  let total = 0;

  for (const day of eachDay(addDays(today, -(PATTERN_DAYS - 1)), today)) {
    const checkIns = checkInsOn(index, day);
    daysByLevel[intensityLevel(checkIns.length) as IntensityLevel] += 1;
    const weekday = weekdayOf(day);
    for (const checkIn of checkIns) {
      byWeekday[weekday] = (byWeekday[weekday] ?? 0) + 1;
      byTimeOfDay[timeOfDay(checkIn.minute)] += 1;
      perActivity.set(checkIn.activityId, (perActivity.get(checkIn.activityId) ?? 0) + 1);
      total += 1;
    }
  }

  const most = Math.max(...byWeekday);
  return {
    total,
    daysByLevel,
    activePercent: Math.round(((PATTERN_DAYS - daysByLevel[0]) / PATTERN_DAYS) * 100),
    byWeekday,
    bestWeekday: byWeekday.indexOf(most),
    byTimeOfDay,
    byActivity: ACTIVITIES.map((activity) => ({ activity, count: perActivity.get(activity.id) ?? 0 })).sort(
      (a, b) => b.count - a.count,
    ),
  };
}

/** Check-ins that make a day Peak (intensity level 4). */
export const PEAK_CHECK_INS = 6;

/** The encouraging line at the bottom of Insights, from the streak and today's count. */
export function insightTip(streak: number, todayCount: number): string {
  const lead =
    streak > 0
      ? `Your streak is ${streak} day${streak === 1 ? '' : 's'}.`
      : 'Check in today to start a streak.';
  if (todayCount >= PEAK_CHECK_INS) return `${lead} Today is already a Peak day.`;
  const more = PEAK_CHECK_INS - todayCount;
  return `${lead} ${more} more check-in${more === 1 ? '' : 's'} today make${more === 1 ? 's' : ''} it a Peak day.`;
}
