import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The days the account worked out, from Teras (the companion workout app), drawn as Home's training wave.
 * Dates only: sync asks Supabase `public.workout_days` just whether each day had a workout, so what was
 * trained, how much and how hard stay in Teras. Teras writes them; Streak never sends them back. No sync
 * columns, since nothing here is ever sent.
 */
export const workoutDays = sqliteTable(
  'workout_days',
  {
    userId: text('user_id').notNull(),
    /** The person's local calendar day (YYYY-MM-DD). */
    date: text('date').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
);

export type WorkoutDayRow = typeof workoutDays.$inferSelect;
