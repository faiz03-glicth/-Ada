import { and, asc, count, eq, inArray, isNull, notInArray } from 'drizzle-orm';

import { checkIns, type CheckInRow, type NewCheckInRow } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

/** Whose check-ins: a signed-in user's id, or null for the guest on this device. */
export type CheckInOwner = string | null;

/** A check-in as the server has it (another phone's, or this one's sent earlier), ready to store here. */
export interface PulledCheckIn {
  id: string;
  date: string;
  minute: number;
  activityId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Which version of a row was sent: it's marked clean only if it's still that version. */
export interface SentVersion {
  id: string;
  updatedAt: string;
}

const ownedBy = (owner: CheckInOwner) =>
  owner === null ? isNull(checkIns.userId) : eq(checkIns.userId, owner);

const unsent = (userId: string, skipIds: readonly string[]) =>
  and(
    eq(checkIns.userId, userId),
    eq(checkIns.dirty, true),
    skipIds.length ? notInArray(checkIns.id, [...skipIds]) : undefined,
  );

const sameContent = (local: CheckInRow, pulled: PulledCheckIn) =>
  local.date === pulled.date &&
  local.minute === pulled.minute &&
  local.activityId === pulled.activityId &&
  local.note === pulled.note &&
  local.deletedAt === pulled.deletedAt &&
  local.updatedAt === pulled.updatedAt;

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

  /** The account's rows still to send (deletions too), least recently changed first. */
  listDirty(userId: string, limit: number, skipIds: readonly string[]): Promise<CheckInRow[]>;
  countDirty(userId: string, skipIds: readonly string[]): Promise<number>;
  /** Marks sent rows clean, each only if it hasn't changed since it was read (an Undo mid-upload stays). */
  markClean(sent: readonly SentVersion[]): Promise<void>;
  /**
   * Stores rows pulled for the account, in one transaction. The newest edit wins, as on the server: a row
   * changed here and not sent yet is kept unless the pulled version is newer. Returns how many rows changed.
   */
  applyPulled(userId: string, rows: readonly PulledCheckIn[]): Promise<number>;
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

    async listDirty(userId, limit, skipIds) {
      return db
        .select()
        .from(checkIns)
        .where(unsent(userId, skipIds))
        .orderBy(asc(checkIns.updatedAt), asc(checkIns.id))
        .limit(limit)
        .all();
    },

    async countDirty(userId, skipIds) {
      const row = db.select({ total: count() }).from(checkIns).where(unsent(userId, skipIds)).get();
      return row?.total ?? 0;
    },

    async markClean(sent) {
      db.transaction((tx) => {
        for (const { id, updatedAt } of sent) {
          tx.update(checkIns)
            .set({ dirty: false })
            .where(and(eq(checkIns.id, id), eq(checkIns.updatedAt, updatedAt)))
            .run();
        }
      });
    },

    async applyPulled(userId, rows) {
      if (!rows.length) return 0;
      return db.transaction((tx) => {
        const ids = rows.map((row) => row.id);
        const known = new Map(
          tx
            .select()
            .from(checkIns)
            .where(inArray(checkIns.id, ids))
            .all()
            .map((row) => [row.id, row]),
        );
        let changed = 0;
        for (const row of rows) {
          const local = known.get(row.id);
          if (!local) {
            tx.insert(checkIns)
              .values({ ...row, userId, dirty: false })
              .run();
            changed += 1;
            continue;
          }
          // Never touch a row this phone holds for someone else (a guest's, or another account's).
          if (local.userId !== userId) continue;
          // An unsent change here wins unless the pulled one is newer (then this phone's edit lost).
          if (local.dirty && local.updatedAt >= row.updatedAt) continue;
          if (!local.dirty && sameContent(local, row)) continue;
          tx.update(checkIns)
            .set({
              minute: row.minute,
              activityId: row.activityId,
              note: row.note,
              updatedAt: row.updatedAt,
              deletedAt: row.deletedAt,
              dirty: false,
            })
            .where(eq(checkIns.id, row.id))
            .run();
          changed += 1;
        }
        return changed;
      });
    },
  };
}
