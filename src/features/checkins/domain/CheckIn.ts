import { isActivityId } from '@/features/activities/domain/catalog';
import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * The one check-in model every screen reads (Home, Day details, Calendar, History, Insights, Profile).
 * `date` is a local calendar day and `minute` the local time of day, so a check-in always stays on the day
 * it was logged for.
 */
export interface CheckIn {
  id: string;
  date: ISODate;
  /** Minutes since local midnight, 0–1439. */
  minute: number;
  activityId: string;
  /** '' when there is none. */
  note: string;
  createdAt: string;
}

export interface NewCheckIn {
  date: ISODate;
  minute: number;
  activityId: string;
  note: string;
}

export const MAX_NOTE_LENGTH = 280;
export const LAST_MINUTE_OF_DAY = 24 * 60 - 1;

export type CheckInProblem = 'unknownActivity' | 'futureDay' | 'invalidTime' | 'noteTooLong';

/**
 * PURE: checks a check-in before it's saved and tidies it (a trimmed note). A check-in can't be in the
 * future: not on a later day, and not later today than `nowMinute`.
 */
export function validateNewCheckIn(
  input: NewCheckIn,
  today: ISODate,
  nowMinute: number,
): { ok: true; value: NewCheckIn } | { ok: false; problem: CheckInProblem } {
  if (!isActivityId(input.activityId)) return { ok: false, problem: 'unknownActivity' };
  if (input.date > today) return { ok: false, problem: 'futureDay' };
  const minute = input.minute;
  if (!Number.isInteger(minute) || minute < 0 || minute > LAST_MINUTE_OF_DAY) {
    return { ok: false, problem: 'invalidTime' };
  }
  if (input.date === today && minute > nowMinute) return { ok: false, problem: 'invalidTime' };
  const note = input.note.trim();
  if (note.length > MAX_NOTE_LENGTH) return { ok: false, problem: 'noteTooLong' };
  return { ok: true, value: { ...input, note } };
}

/** What each problem means to the person, and how to fix it. */
export const CHECK_IN_PROBLEM_COPY: Record<CheckInProblem, string> = {
  unknownActivity: 'Pick an activity to check in.',
  futureDay: "You can't check in on a day that hasn't happened yet.",
  invalidTime: 'Pick a time that has already passed.',
  noteTooLong: `Keep the note under ${MAX_NOTE_LENGTH} characters.`,
};

/** Minutes since local midnight for a Date. */
export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
