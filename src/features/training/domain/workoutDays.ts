import type { DayCellOptions } from '@/features/heatmap/domain/calendarGrid';
import type { IntensityLevel } from '@/features/heatmap/domain/intensity';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { shortDate } from '@/shared/lib/format/dates';

/**
 * The training wave knows one thing per day: whether the account worked out (in Teras). A workout day is
 * drawn at the darkest level, so it stands out clearly from the days without one.
 */
export const WORKOUT_DAY_LEVEL: IntensityLevel = 4;

/** PURE: "1 workout day", "12 workout days". */
export function workoutDayCount(count: number): string {
  return `${count} workout day${count === 1 ? '' : 's'}`;
}

/** PURE: how many of the days fall from `from` to `to`, both included. */
export function workoutDaysBetween(days: ReadonlySet<ISODate>, from: ISODate, to: ISODate): number {
  return [...days].filter((day) => day >= from && day <= to).length;
}

/** PURE: how the heatmap's month builders draw the training wave's days and read them out. */
export function workoutDayCells(
  days: ReadonlySet<ISODate>,
): Pick<DayCellOptions, 'countOn' | 'levelOn' | 'labelOn'> {
  return {
    countOn: (day) => (days.has(day) ? 1 : 0),
    levelOn: (day) => (days.has(day) ? WORKOUT_DAY_LEVEL : 0),
    labelOn: (day) => `${shortDate(day)}: ${days.has(day) ? 'Workout' : 'No workout'}`,
  };
}
