import { and, eq } from 'drizzle-orm';

import { syncState } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** What is pulled from the server, each with its own bookmark per account. */
export type SyncStream = 'check_ins' | 'workout_days';

/** The last row pulled: its server time (exactly as the server wrote it) and its key. */
export interface SyncCursor {
  at: string;
  key: string;
}

/** Data source: SQLite `sync_state` only. Local bookkeeping, never synced. */
export interface SyncStateDao {
  getCursor(userId: string, stream: SyncStream): Promise<SyncCursor | null>;
  setCursor(userId: string, stream: SyncStream, cursor: SyncCursor): Promise<void>;
}

export function createSyncStateDao(db: AppDatabase): SyncStateDao {
  return {
    async getCursor(userId, stream) {
      const row = db
        .select()
        .from(syncState)
        .where(and(eq(syncState.userId, userId), eq(syncState.stream, stream)))
        .get();
      return row ? { at: row.cursorAt, key: row.cursorKey } : null;
    },

    async setCursor(userId, stream, cursor) {
      db.insert(syncState)
        .values({ userId, stream, cursorAt: cursor.at, cursorKey: cursor.key })
        .onConflictDoUpdate({
          target: [syncState.userId, syncState.stream],
          set: { cursorAt: cursor.at, cursorKey: cursor.key },
        })
        .run();
    },
  };
}
