import { activityById } from '@/features/activities/domain/catalog';
import type { CheckIn } from '@/features/checkins/domain/CheckIn';
import { checkInsOn, type CheckInIndex } from '@/features/checkins/domain/checkInIndex';
import type { ISODate } from '@/shared/lib/date/isoDate';

/** 'all', or one activity's id. */
export type HistoryFilter = string;
export const ALL_ACTIVITIES: HistoryFilter = 'all';

export interface HistoryGroup {
  day: ISODate;
  /** Every check-in that day (the day's heat), not just the ones that match. */
  count: number;
  /** The matching check-ins, latest first. */
  items: readonly CheckIn[];
}

/** Lower-cased "activity name + note", built once per check-in and reused by every search. */
const searchText = new WeakMap<CheckIn, string>();
function textOf(checkIn: CheckIn): string {
  let text = searchText.get(checkIn);
  if (text === undefined) {
    text = `${activityById(checkIn.activityId).name} ${checkIn.note}`.toLowerCase();
    searchText.set(checkIn, text);
  }
  return text;
}

/**
 * PURE: History's list: days (latest first) holding the check-ins that match the activity filter and the
 * search (activity names and notes, any case). Days with no match are left out.
 */
export function historyGroups(index: CheckInIndex, filter: HistoryFilter, query: string): HistoryGroup[] {
  const needle = query.trim().toLowerCase();
  const groups: HistoryGroup[] = [];
  for (const day of index.days) {
    const all = checkInsOn(index, day);
    const items = all.filter(
      (checkIn) =>
        (filter === ALL_ACTIVITIES || checkIn.activityId === filter) &&
        (!needle || textOf(checkIn).includes(needle)),
    );
    if (items.length) groups.push({ day, count: all.length, items: items.reverse() });
  }
  return groups;
}
