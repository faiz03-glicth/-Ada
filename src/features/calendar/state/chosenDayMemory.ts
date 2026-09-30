import { monthOf, type YearMonth } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * The day last chosen in each month on the Day sheet's wheel, for this session only: reopening a month
 * starts where the person left it, rather than at an unrelated day. Never persisted.
 */
const chosen = new Map<string, ISODate>();
const key = ({ year, month }: YearMonth) => `${year}-${month}`;

export const chosenDayMemory = {
  get: (month: YearMonth): ISODate | undefined => chosen.get(key(month)),
  set: (day: ISODate): void => {
    chosen.set(key(monthOf(day)), day);
  },
  /** Tests only. */
  clear: (): void => chosen.clear(),
};
