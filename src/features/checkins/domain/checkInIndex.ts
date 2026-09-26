import type { ISODate } from '@/shared/lib/date/isoDate';

import type { CheckIn } from './CheckIn';

/**
 * Check-ins arranged for reading: by day (earliest first within a day) plus the totals every screen needs.
 * Built once per change to the list and shared by every screen (see indexCheckIns), so a new check-in
 * costs one pass over the data, not one per screen.
 */
export interface CheckInIndex {
  byDay: ReadonlyMap<ISODate, readonly CheckIn[]>;
  /** Days with at least one check-in, latest first. */
  days: readonly ISODate[];
  total: number;
  /** The most recently logged check-in (by when it was saved), for "repeat last". */
  latest: CheckIn | null;
}

const EMPTY: readonly CheckIn[] = [];
const cache = new WeakMap<readonly CheckIn[], CheckInIndex>();

/** PURE (memoised per list): the index for a list of check-ins. The same list always gives the same index. */
export function indexCheckIns(list: readonly CheckIn[]): CheckInIndex {
  const cached = cache.get(list);
  if (cached) return cached;

  const byDay = new Map<ISODate, CheckIn[]>();
  let latest: CheckIn | null = null;
  for (const checkIn of list) {
    const day = byDay.get(checkIn.date);
    if (day) day.push(checkIn);
    else byDay.set(checkIn.date, [checkIn]);
    if (!latest || checkIn.createdAt > latest.createdAt) latest = checkIn;
  }
  for (const day of byDay.values()) day.sort((a, b) => a.minute - b.minute);
  const days = [...byDay.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const index: CheckInIndex = { byDay, days, total: list.length, latest };
  cache.set(list, index);
  return index;
}

export function checkInsOn(index: CheckInIndex, day: ISODate): readonly CheckIn[] {
  return index.byDay.get(day) ?? EMPTY;
}

export function countOn(index: CheckInIndex, day: ISODate): number {
  return index.byDay.get(day)?.length ?? 0;
}
