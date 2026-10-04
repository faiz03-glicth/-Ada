import { and, asc, eq, inArray } from 'drizzle-orm';

import { workoutDays } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** A day as the server has it: only whether the account worked out on it (Teras keeps the rest). */
export interface PulledWorkoutDay {
  date: string;
  workedOut: boolean;
}

/** Data source: SQLite `workout_days` only, a copy of the server's dates. Nothing here is ever sent. */
export interface WorkoutDayDao {
  /** The days the account worked out, oldest first. */
  list(userId: string): Promise<string[]>;
  /**
   * Stores pulled days for the account in one transaction: a day worked out is kept, and a day that no
   * longer is (its sets were removed in Teras) is dropped. Returns how many days changed.
   */
  applyPulled(userId: string, days: readonly PulledWorkoutDay[]): Promise<number>;
}

const dayOf = (userId: string, date: string) =>
  and(eq(workoutDays.userId, userId), eq(workoutDays.date, date));

export function createWorkoutDayDao(db: AppDatabase): WorkoutDayDao {
  return {
    async list(userId) {
      return db
        .select({ date: workoutDays.date })
        .from(workoutDays)
        .where(eq(workoutDays.userId, userId))
        .orderBy(asc(workoutDays.date))
        .all()
        .map((row) => row.date);
    },

    async applyPulled(userId, days) {
      if (!days.length) return 0;
      return db.transaction((tx) => {
        const held = new Set(
          tx
            .select({ date: workoutDays.date })
            .from(workoutDays)
            .where(
              and(
                eq(workoutDays.userId, userId),
                inArray(
                  workoutDays.date,
                  days.map((day) => day.date),
                ),
              ),
            )
            .all()
            .map((row) => row.date),
        );
        let changed = 0;
        for (const { date, workedOut } of days) {
          if (workedOut === held.has(date)) continue;
          if (workedOut) {
            tx.insert(workoutDays).values({ userId, date }).onConflictDoNothing().run();
            held.add(date);
          } else {
            tx.delete(workoutDays).where(dayOf(userId, date)).run();
            held.delete(date);
          }
          changed += 1;
        }
        return changed;
      });
    },
  };
}
