import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * The day last chosen in each month on the date wheel, for this session only: reopening a month starts
 * where the person left it, rather than at an unrelated day. Never persisted.
 */
const chosen = new Map<string, ISODate>();

export const dayPickerMemory = {
  get: (monthKey: string): ISODate | undefined => chosen.get(monthKey),
  set: (monthKey: string, day: ISODate): void => {
    chosen.set(monthKey, day);
  },
  /** Tests only. */
  clear: (): void => chosen.clear(),
};
