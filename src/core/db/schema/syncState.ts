import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Where each account's pull from the server got to, per stream ("check_ins", "workout_days"). The cursor
 * is the last row pulled: the server's own timestamp string, kept exactly as the server wrote it
 * (microseconds and all), plus that row's key (an id, or a date) for rows that share a timestamp.
 * Local-only, never synced; one row per account, so switching accounts on a phone never skips anyone's
 * rows.
 */
export const syncState = sqliteTable(
  'sync_state',
  {
    userId: text('user_id').notNull(),
    stream: text('stream').notNull(),
    cursorAt: text('cursor_at').notNull(),
    cursorKey: text('cursor_key').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.stream] })],
);

export type SyncStateRow = typeof syncState.$inferSelect;
