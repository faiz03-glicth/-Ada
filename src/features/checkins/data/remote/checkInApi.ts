import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { AppError } from '@/core/errors/AppError';
import { fromServerTime } from '@/shared/lib/date/serverTime';

import type { PulledCheckIn } from '../local/checkInDao';

/** A check-in as it's sent: the row's own values, never its owner (the server takes that from the session). */
export interface PushedCheckIn {
  id: string;
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
  // 22xxx bad data, 23xxx constraint, 42501 row-level security: the same rows would fail again.
  const code = error.code ?? '';
  if (/^2[23]/.test(code) || code === '42501') {
    return new AppError('Rejected', `Check-ins refused by the server (${code})`);
  }
  return new AppError('Unknown', 'Check-in sync request failed');
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
      const parsed = z.array(pulledSchema).safeParse(data ?? []);
      if (!parsed.success) throw new AppError('Unknown', 'Check-in response had an unexpected shape');

      const rows: PulledCheckIn[] = [];
      for (const row of parsed.data) {
        const createdAt = fromServerTime(row.created_at);
        const updatedAt = fromServerTime(row.updated_at);
        const deletedAt = row.deleted_at === null ? null : fromServerTime(row.deleted_at);
        if (!createdAt || !updatedAt || (row.deleted_at !== null && !deletedAt)) {
          throw new AppError('Unknown', 'Check-in response had an unexpected time');
        }
        rows.push({
          id: row.id,
          date: row.date,
          minute: row.minute,
          activityId: row.activity_id,
          note: row.note,
          createdAt,
          updatedAt,
          deletedAt,
        });
      }
      const last = parsed.data.at(-1);
      return { rows, next: last ? { at: last.synced_at, key: last.id } : null };
    },
  };
}
