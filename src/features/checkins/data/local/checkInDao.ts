import { and, asc, eq, isNull } from 'drizzle-orm';

import { checkIns, type CheckInRow, type NewCheckInRow } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** Whose check-ins: a signed-in user's id, or null for the guest on this device. */
export type CheckInOwner = string | null;

const ownedBy = (owner: CheckInOwner) =>
  owner === null ? isNull(checkIns.userId) : eq(checkIns.userId, owner);

/** Data source: SQLite `check_ins` only. Deletes are soft (`deleted_at`) and mark the row for sync. */
export interface CheckInDao {
  /** The owner's live check-ins, oldest first. */
  list(owner: CheckInOwner): Promise<CheckInRow[]>;
  insert(row: NewCheckInRow): Promise<void>;
  getById(id: string): Promise<CheckInRow | null>;
  softDelete(id: string, now: string): Promise<void>;
  restore(id: string, now: string): Promise<void>;
  /** Soft-deletes every live check-in the owner has; returns how many. */
  softDeleteAll(owner: CheckInOwner, now: string): Promise<number>;
}

export function createCheckInDao(db: AppDatabase): CheckInDao {
  return {
    async list(owner) {
      return db
        .select()
        .from(checkIns)
        .where(and(ownedBy(owner), isNull(checkIns.deletedAt)))
        .orderBy(asc(checkIns.date), asc(checkIns.minute))
        .all();
    },

    async insert(row) {
      db.insert(checkIns).values(row).run();
    },

    async getById(id) {
      return db.select().from(checkIns).where(eq(checkIns.id, id)).get() ?? null;
    },

    async softDelete(id, now) {
      db.update(checkIns)
        .set({ deletedAt: now, updatedAt: now, dirty: true })
        .where(eq(checkIns.id, id))
        .run();
    },

    async restore(id, now) {
      db.update(checkIns)
        .set({ deletedAt: null, updatedAt: now, dirty: true })
        .where(eq(checkIns.id, id))
        .run();
    },

    async softDeleteAll(owner, now) {
      const where = and(ownedBy(owner), isNull(checkIns.deletedAt));
      const live = db.select({ id: checkIns.id }).from(checkIns).where(where).all();
      db.update(checkIns).set({ deletedAt: now, updatedAt: now, dirty: true }).where(where).run();
      return live.length;
    },
  };
}
