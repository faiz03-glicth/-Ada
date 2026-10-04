import { ACTIVITIES, isActivityId } from '@/features/activities/domain/catalog';
import type { ISODate } from '@/shared/lib/date/isoDate';

/**
 * The one check-in model every screen reads (Home, the Day sheet, Calendar, History, Insights, Profile).
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

// Control characters (C0, DEL, C1) and the Unicode line and paragraph separators: the server refuses them.
const CONTROL_RUN = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;
// A whole surrogate pair (one emoji), or half of one, which no server can store.
const SURROGATES = /[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;

/**
 * PURE: a note the server will always accept, so a check-in can never be refused and retried forever.
 * Control characters (line breaks, tabs) become one space, half of a split emoji is dropped, and the note
 * is trimmed and at most MAX_NOTE_LENGTH long. Used when saving and again before upload (for older notes).
 */
export function cleanNote(note: string): string {
  const cleaned = note
    .replace(SURROGATES, (match) => (match.length === 2 ? match : ''))
    .replace(CONTROL_RUN, ' ')
    .trim();
  if (cleaned.length <= MAX_NOTE_LENGTH) return cleaned;
  // The cut can land inside an emoji: drop the half it leaves.
  return cleaned
    .slice(0, MAX_NOTE_LENGTH)
    .replace(/[\ud800-\udbff]$/, '')
    .trimEnd();
}

export type CheckInProblem = 'unknownActivity' | 'futureDay' | 'invalidTime' | 'noteTooLong';

/**
 * PURE: checks a check-in before it's saved and tidies it (a clean note, see cleanNote). A check-in can't be in the
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
  return { ok: true, value: { ...input, note: cleanNote(note) } };
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

/** Check-ins on another day are logged at midday: only the day matters (as in the prototype). */
export const OTHER_DAY_MINUTE = 12 * 60;

/** PURE: when a check-in without a picked time is logged: now for today, midday on any earlier day. */
export function quickCheckInMinute(day: ISODate, today: ISODate, now: Date): number {
  return day === today ? minuteOfDay(now) : OTHER_DAY_MINUTE;
}

/**
 * PURE: the activity a new check-in starts on: the last one logged (what people repeat most), else the
 * first one they chose to track, else the first activity.
 */
export function startingActivityId(latest: CheckIn | null, picks: readonly string[]): string {
  return latest?.activityId ?? picks[0] ?? ACTIVITIES[0]?.id ?? 'workout';
}
