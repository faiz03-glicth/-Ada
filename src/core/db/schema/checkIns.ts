import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { syncColumns } from './columns';

/**
 * One check-in: something done on a day. `date` is the person's local calendar day (YYYY-MM-DD) and
 * `minute` the local time of day (0–1439), as in the prototype: a day never moves when the phone's time
 * zone changes, so the heatmap a person built stays the heatmap they see. Rows are soft-deleted
 * (`deleted_at`) so Undo can bring one back and sync can pass deletions on.
 */
export const checkIns = sqliteTable(
  'check_ins',
  {
    ...syncColumns(),
    date: text('date').notNull(),
    minute: integer('minute').notNull(),
    activityId: text('activity_id').notNull(),
    note: text('note').notNull().default(''),
  },
  (table) => [index('check_ins_owner_date').on(table.userId, table.date)],
);

export type CheckInRow = typeof checkIns.$inferSelect;
export type NewCheckInRow = typeof checkIns.$inferInsert;
