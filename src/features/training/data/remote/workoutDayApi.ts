import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { AppError } from '@/core/errors/AppError';
import { fromServerTime } from '@/shared/lib/date/serverTime';

import type { PulledWorkoutDay } from '../local/workoutDayDao';

/** Where a pull continues from: the last day's change time (exactly as the server wrote it) and date. */
export interface WorkoutDayCursor {
  at: string;
  key: string;
}

export interface PulledWorkoutDayPage {
  days: PulledWorkoutDay[];
  /** Days this app can't read (not written the way Teras writes them): left out, and passed over. */
  skipped: number;
  /** The cursor after this page; null when no day on it carries a usable one. */
  next: WorkoutDayCursor | null;
}

/**
 * Network: offline or unreachable. Unavailable: Teras's table isn't in this project or can't be read,
 * which trying again won't fix. Unknown: anything else (try again later).
 */
export type WorkoutDayApiErrorCode = 'Network' | 'Unavailable' | 'Unknown';

/**
 * All Streak asks of Teras's `workout_days`: each day's date, whether the account worked out that day, and
 * when the row last changed (for the bookmark). The server works `worked_out` out from the day's completed
 * sets, Teras's own rule for "No workout", so what was trained, how much and how hard never reach Streak.
 */
const COLUMNS = 'date,updated_at,worked_out:sets::boolean';

/** No real change is dated after 2100: a later time is a buggy writer's and never becomes the bookmark. */
const LAST_REAL_TIME = Date.UTC(2101, 0, 1);

// What a cursor may contain, so it can't change the meaning of the filter it's written into.
const CURSOR_AT = /^[0-9T:.+\- Z]{10,40}$/;
const CURSOR_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Server rows are external data: validated, never cast. */
const pulledSchema = z.object({
  date: z.string().regex(CURSOR_KEY),
  worked_out: z.boolean(),
});

/** The fields a bookmark is made of, checked on their own: a day the app can't read still moves it on. */
const cursorSchema = z.object({
  date: z.string().regex(CURSOR_KEY),
  updated_at: z.string().regex(CURSOR_AT),
});

/** Data source: Supabase `public.workout_days`, written by Teras. Read-only here; RLS limits it to the user. */
export interface WorkoutDayApi {
  /** The account's days changed after `after` (or all of them), oldest change first. */
  pull(userId: string, after: WorkoutDayCursor | null, limit: number): Promise<PulledWorkoutDayPage>;
}

function toAppError(error: { message: string; code?: string }): AppError<WorkoutDayApiErrorCode> {
  if (/network request failed|failed to fetch|network error/i.test(error.message)) {
    return new AppError('Network', 'Network request failed');
  }
  // 42xxx (no such table or column, no permission) and PGRST2xx (not in the schema cache): Teras's table
  // isn't set up here, and asking again won't change that.
  const code = error.code ?? '';
  if (/^(42|PGRST2)/.test(code)) {
    return new AppError('Unavailable', `Workout days can't be read (${code})`);
  }
  return new AppError('Unknown', `Workout days request failed (${code || 'no code'})`);
}

/** `updated_at > at, or the same time and a later date`: the days after the cursor, none skipped or repeated. */
export function afterWorkoutDayFilter(after: WorkoutDayCursor): string {
  if (!CURSOR_AT.test(after.at) || !CURSOR_KEY.test(after.key)) {
    throw new AppError('Unknown', 'Invalid workout days cursor');
  }
  const at = `"${after.at}"`;
  return `updated_at.gt.${at},and(updated_at.eq.${at},date.gt.${after.key})`;
}

/**
 * The bookmark after a page: the last day that carries a usable one, readable or not, so a day the app
 * can't read never stops the pull for good. A change time after 2100 is passed over: as the bookmark it
 * would hide every later change. Such a day sorts last, so it's simply fetched again next time.
 */
function cursorAfter(items: readonly unknown[]): WorkoutDayCursor | null {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const cursor = cursorSchema.safeParse(items[i]);
    if (!cursor.success) continue;
    const at = fromServerTime(cursor.data.updated_at);
    if (at && Date.parse(at) < LAST_REAL_TIME) return { at: cursor.data.updated_at, key: cursor.data.date };
  }
  return null;
}

export function createWorkoutDayApi(supabase: SupabaseClient): WorkoutDayApi {
  return {
    async pull(userId, after, limit) {
      let query = supabase
        .from('workout_days')
        .select(COLUMNS)
        .eq('user_id', userId)
        .order('updated_at', { ascending: true })
        .order('date', { ascending: true })
        .limit(limit);
      if (after) query = query.or(afterWorkoutDayFilter(after));
      const { data, error } = await query;
      if (error) throw toAppError(error);
      const items: unknown = data ?? [];
      if (!Array.isArray(items))
        throw new AppError('Unknown', 'Workout days response had an unexpected shape');
      const days = items.flatMap((item) => {
        const parsed = pulledSchema.safeParse(item);
        return parsed.success ? [{ date: parsed.data.date, workedOut: parsed.data.worked_out }] : [];
      });
      return { days, skipped: items.length - days.length, next: cursorAfter(items) };
    },
  };
}
