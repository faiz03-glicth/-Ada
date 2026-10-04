import {
  addDays,
  addMonths,
  daysBetween,
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

import { LAST_MINUTE_OF_DAY } from './CheckIn';
import { checkInsOn, countOn, type CheckInIndex } from './checkInIndex';

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
  /** Check-ins per period over the periods before the current one, to one decimal. */
  average: number;
  /**
   * How the current period so far compares with the same stretch of the periods before it (this week's
   * days up to now against the same days, up to the same time, of the earlier weeks), in whole percent.
   * A period that has only just begun isn't judged against whole ones. Null when the earlier stretches
   * had nothing to compare against.
   */
  deltaPercent: number | null;
}

/** One period of the trend (a day, week or month) and its axis label. */
interface TrendPeriod {
  from: ISODate;
  to: ISODate;
  label: string;
}

function trendPeriods(range: TrendRange, today: ISODate, weekStart: WeekStart): TrendPeriod[] {
  if (range === 'W') {
    const thisWeek = startOfWeek(today, weekStart);
    return Array.from({ length: 12 }, (_, i) => {
      const from = addDays(thisWeek, -7 * (11 - i));
      return { from, to: addDays(from, 6), label: '' };
    });
  }
  if (range === 'M') {
    const current = monthOf(today);
    return Array.from({ length: 6 }, (_, i) => {
      const month = addMonths(current, i - 5);
      return { from: firstOfMonth(month), to: lastOfMonth(month), label: monthShort(month.month) };
    });
  }
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { from: day, to: day, label: weekdayShort(weekdayOf(day)).slice(0, 1) };
  });
}

/**
 * Check-ins in a period's first `elapsed` + 1 days, the last of them counted only up to `untilMinute`.
 * A shorter period (February against a 31st) counts whole: its stretch ends on its last day.
 */
function stretchTotal(
  index: CheckInIndex,
  period: TrendPeriod,
  elapsed: number,
  untilMinute: number,
): number {
  const end = addDays(period.from, elapsed);
  let total = 0;
  for (const day of eachDay(period.from, minDay(end, period.to))) {
    total +=
      day === end
        ? checkInsOn(index, day).filter((c) => c.minute <= untilMinute).length
        : countOn(index, day);
  }
  return total;
}

const mean = (values: readonly number[]) =>
  values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0;

/**
 * Check-ins per day (last 7 days), week (last 12 weeks) or month (last 6 months), as on Home. The current
 * period so far is compared with the same stretch of the ones before it, up to `nowMinute` (the time of
 * day now; the whole day when left out).
 */
export function trend(
  index: CheckInIndex,
  range: TrendRange,
  today: ISODate,
  weekStart: WeekStart,
  nowMinute: number = LAST_MINUTE_OF_DAY,
): Trend {
  const periods = trendPeriods(range, today, weekStart);
  const values = periods.map((p) => summarize(index, p.from, p.to, today).total);
  const current = periods[periods.length - 1];
  const elapsed = current ? daysBetween(current.from, today) : 0;
  const stretches = periods.map((p) => stretchTotal(index, p, elapsed, nowMinute));
  const usual = mean(stretches.slice(0, -1));
  const sofar = stretches[stretches.length - 1] ?? 0;
  return {
    unit: range === 'W' ? 'week' : range === 'M' ? 'month' : 'day',
    values,
    labels: periods.map((p) => p.label),
    average: Math.round(mean(values.slice(0, -1)) * 10) / 10,
    deltaPercent: usual > 0 ? Math.round(((sofar - usual) / usual) * 100) : null,
  };
}
