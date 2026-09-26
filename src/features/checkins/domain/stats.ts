import {
  addDays,
  addMonths,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  minDay,
  monthOf,
  monthShort,
  startOfWeek,
  weekdayOf,
  weekdayShort,
  type WeekStart,
} from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { countOn, type CheckInIndex } from './checkInIndex';

/**
 * The derived numbers every screen shows, computed in one place from the check-in index. PURE: `today`
 * and the week start are always passed in, so the same data gives the same numbers everywhere.
 */

export interface RangeSummary {
  /** Check-ins in the range. */
  total: number;
  /** Days in the range with at least one check-in. */
  activeDays: number;
  /** Days in the range (up to today: days that haven't happened don't count). */
  days: number;
}

/** Totals over `from`…`to` inclusive, ignoring any part of the range after `today`. */
export function summarize(index: CheckInIndex, from: ISODate, to: ISODate, today: ISODate): RangeSummary {
  let total = 0;
  let activeDays = 0;
  let days = 0;
  for (const day of eachDay(from, minDay(to, today))) {
    const count = countOn(index, day);
    total += count;
    if (count > 0) activeDays += 1;
    days += 1;
  }
  return { total, activeDays, days };
}

/**
 * Consecutive days with a check-in, ending today. A day without one yet doesn't break the streak until
 * it's over: with nothing logged today, the streak counts back from yesterday.
 */
export function currentStreak(index: CheckInIndex, today: ISODate): number {
  let day = countOn(index, today) > 0 ? today : addDays(today, -1);
  let streak = 0;
  while (countOn(index, day) > 0) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** The longest run of consecutive days with a check-in, ever. */
export function bestStreak(index: CheckInIndex): number {
  let best = 0;
  let run = 0;
  let previous: ISODate | null = null;
  // `days` is latest first: a run continues while each day is the one before the previous.
  for (const day of index.days) {
    run = previous !== null && addDays(previous, -1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

export type TrendRange = 'D' | 'W' | 'M';

export interface Trend {
  unit: 'day' | 'week' | 'month';
  /** Oldest first; the last is the current day, week or month. */
  values: readonly number[];
  /** One per value ('' where the axis shows nothing). */
  labels: readonly string[];
  /** The average of the periods before the current one, rounded. */
  average: number;
  /** How the current period compares with that average, in whole percent (0 when there is no average). */
  deltaPercent: number;
}

/**
 * Check-ins per day (last 7 days), week (last 12 weeks) or month (last 6 months), as on Home. The current
 * period is compared with the average of the ones before it.
 */
export function trend(index: CheckInIndex, range: TrendRange, today: ISODate, weekStart: WeekStart): Trend {
  const values: number[] = [];
  const labels: string[] = [];
  if (range === 'W') {
    const thisWeek = startOfWeek(today, weekStart);
    for (let i = 11; i >= 0; i -= 1) {
      const start = addDays(thisWeek, -7 * i);
      values.push(summarize(index, start, addDays(start, 6), today).total);
      labels.push('');
    }
  } else if (range === 'M') {
    const current = monthOf(today);
    for (let i = 5; i >= 0; i -= 1) {
      const month = addMonths(current, -i);
      values.push(summarize(index, firstOfMonth(month), lastOfMonth(month), today).total);
      labels.push(monthShort(month.month));
    }
  } else {
    for (let i = 6; i >= 0; i -= 1) {
      const day = addDays(today, -i);
      values.push(countOn(index, day));
      labels.push(weekdayShort(weekdayOf(day)).slice(0, 1));
    }
  }
  const before = values.slice(0, -1);
  const average = before.length ? Math.round(before.reduce((sum, n) => sum + n, 0) / before.length) : 0;
  const current = values[values.length - 1] ?? 0;
  const deltaPercent = average ? Math.round(((current - average) / average) * 100) : 0;
  return {
    unit: range === 'W' ? 'week' : range === 'M' ? 'month' : 'day',
    values,
    labels,
    average,
    deltaPercent,
  };
}
