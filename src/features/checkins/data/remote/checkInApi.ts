import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { AppError } from '@/core/errors/AppError';
import { fromServerTime } from '@/shared/lib/date/serverTime';

import type { PulledCheckIn } from '../local/checkInDao';

/**
 * A check-in as it's sent. `user_id` names the account the phone means it for; the server stores the
 * session's account and refuses the whole batch if the two differ (the session changed mid-upload).
 */
export interface PushedCheckIn {
  id: string;
  user_id: string;
  date: string;
  minute: number;
  activity_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Where a pull continues from: the last row's server time (exactly as the server wrote it) and id. */
export interface PullCursor {
  at: string;
  key: string;
}

export interface PulledPage {
  rows: PulledCheckIn[];
  /** Rows this app can't read (written by something other than Streak): left out, and passed over. */
  skipped: number;
  /** The cursor after this page; null when the page was empty. */
  next: PullCursor | null;
}

/**
 * Network: offline or unreachable. Rejected: the server refused the data itself (a constraint, a policy),
 * so sending it again won't help. Unknown: anything else (try again later).
 */
export type CheckInApiErrorCode = 'Network' | 'Rejected' | 'Unknown';

/** Server rows are external data: validated, never cast. */
const pulledSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minute: z.number().int().min(0).max(1439),
  activity_id: z.string().min(1).max(40),
  note: z.string().max(280),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  synced_at: z.string(),
});

// What a cursor may contain, so it can't change the meaning of the filter it's written into.
const CURSOR_AT = /^[0-9T:.+\- Z]{10,40}$/;
const CURSOR_KEY = /^[0-9a-fA-F-]{36}$/;

/** Data source: Supabase `public.check_ins` (RLS limits every call to the signed-in user's rows). */
export interface CheckInApi {
  /** Inserts new check-ins and updates known ones (the newest edit wins on the server). At most 500. */
  push(rows: readonly PushedCheckIn[]): Promise<void>;
  /** The account's rows changed after `after` (or all of them), oldest first. */
  pull(userId: string, after: PullCursor | null, limit: number): Promise<PulledPage>;
}

function toAppError(error: { message: string; code?: string }): AppError<CheckInApiErrorCode> {
  if (/network request failed|failed to fetch|network error/i.test(error.message)) {
    return new AppError('Network', 'Network request failed');
  }
  // 22xxx bad data, 23xxx constraint, and a row-level security refusal: the same rows would fail again.
  // Any other 42501 (no permission at all: the session is gone or belongs to another account) is no fault
  // of the rows, so the run stops instead of setting them aside one by one.
  const code = error.code ?? '';
  const rowLevel = code === '42501' && /row-level security/i.test(error.message);
  if (/^2[23]/.test(code) || rowLevel) {
    return new AppError('Rejected', `Check-ins refused by the server (${code})`);
  }
  return new AppError('Unknown', `Check-in sync request failed (${code || 'no code'})`);
}

const COLUMNS = 'id,date,minute,activity_id,note,created_at,updated_at,deleted_at,synced_at';

/** `synced_at > at, or the same time and a later id`: the rows after the cursor, none skipped or repeated. */
export function afterCursorFilter(after: PullCursor): string {
  if (!CURSOR_AT.test(after.at) || !CURSOR_KEY.test(after.key)) {
    throw new AppError('Unknown', 'Invalid sync cursor');
  }
  const at = `"${after.at}"`;
  return `synced_at.gt.${at},and(synced_at.eq.${at},id.gt.${after.key})`;
}

/** The fields a bookmark is made of, checked on their own: a row the app can't read still moves it on. */
const cursorSchema = z.object({
  synced_at: z.string().regex(CURSOR_AT),
  id: z.string().regex(CURSOR_KEY),
});

/** A server row as a check-in for this phone, or null when it can't be read (it's then left out). */
function toPulled(item: unknown): PulledCheckIn | null {
  const parsed = pulledSchema.safeParse(item);
  if (!parsed.success) return null;
  const row = parsed.data;
  const createdAt = fromServerTime(row.created_at);
  const updatedAt = fromServerTime(row.updated_at);
  const deletedAt = row.deleted_at === null ? null : fromServerTime(row.deleted_at);
  if (!createdAt || !updatedAt || (row.deleted_at !== null && !deletedAt)) return null;
  return {
    id: row.id,
    date: row.date,
    minute: row.minute,
    activityId: row.activity_id,
    note: row.note,
    createdAt,
    updatedAt,
    deletedAt,
  };
}

/**
 * The bookmark after a page: the last row that carries a usable one, readable or not, so a row the app
 * can't read never stops the pull for good. Null when no row has one.
 */
function cursorAfter(items: readonly unknown[]): PullCursor | null {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const cursor = cursorSchema.safeParse(items[i]);
    if (cursor.success) return { at: cursor.data.synced_at, key: cursor.data.id };
  }
  return null;
}

export function createCheckInApi(supabase: SupabaseClient): CheckInApi {
  return {
    async push(rows) {
      if (!rows.length) return;
      const { error } = await supabase.rpc('push_check_ins', { rows });
      if (error) throw toAppError(error);
    },

    async pull(userId, after, limit) {
      let query = supabase
        .from('check_ins')
        .select(COLUMNS)
        .eq('user_id', userId)
        .order('synced_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit);
      if (after) query = query.or(afterCursorFilter(after));
      const { data, error } = await query;
      if (error) throw toAppError(error);
      const items: unknown = data ?? [];
      if (!Array.isArray(items)) throw new AppError('Unknown', 'Check-in response had an unexpected shape');
      const rows = items.map(toPulled).filter((row): row is PulledCheckIn => row !== null);
      return { rows, skipped: items.length - rows.length, next: cursorAfter(items) };
    },
  };
}
