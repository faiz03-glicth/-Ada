import type { CheckInIndex } from '@/features/checkins/domain/checkInIndex';
import { eachDay, firstOfMonth, lastOfMonth, minDay, type YearMonth } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

/** PURE: a month's days that have happened, first to last (the date wheel's days). */
export function daysSoFar(month: YearMonth, today: ISODate): ISODate[] {
  return eachDay(firstOfMonth(month), minDay(lastOfMonth(month), today));
}

/**
 * PURE: the day a month opens on in the Day sheet. The day last chosen there (this session), else today if
 * it's in this month, else the month's most recent day with a check-in, else its last day so far.
 */
export function openingDay(
  month: YearMonth,
  today: ISODate,
  index: CheckInIndex,
  remembered: ISODate | undefined,
): ISODate {
  const days = daysSoFar(month, today);
  const recent = index.days.find((day) => days.includes(day));
  for (const candidate of [remembered, today, recent]) {
    if (candidate !== undefined && days.includes(candidate)) return candidate;
  }
  return days.at(-1) ?? today;
}
