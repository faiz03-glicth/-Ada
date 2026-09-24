import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const APP_META_KEYS = ['guest_id', 'last_user_id', 'last_pulled_at'] as const;
export type AppMetaKey = (typeof APP_META_KEYS)[number];

/** Local-only key/value table for device bookkeeping. Never synced. */
export const appMeta = sqliteTable('app_meta', {
  key: text('key', { enum: APP_META_KEYS }).primaryKey(),
  value: text('value').notNull(),
});
