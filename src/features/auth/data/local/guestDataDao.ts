import { and, count, eq, inArray, isNull } from 'drizzle-orm';

import { appMeta, checkIns, profiles } from '@/core/db/schema';
import type { AppDatabase } from '@/core/db/types';

export interface GuestDataDao {
  /**
   * Hands everything created in guest mode to the signed-in user, atomically:
   * guest-owned rows get the user's id, the guest profile is retired, and the guest markers are cleared.
   */
  reassignGuestData(guestId: string, userId: string, now: string): Promise<void>;
  /** How many live check-ins on this phone belong to the guest. */
  countGuestCheckIns(): Promise<number>;
}

/** Data source: SQLite only. */
export function createGuestDataDao(db: AppDatabase): GuestDataDao {
  return {
    async reassignGuestData(guestId, userId, now) {
      db.transaction((tx) => {
        tx.update(checkIns).set({ userId, dirty: true, updatedAt: now }).where(isNull(checkIns.userId)).run();
        tx.update(profiles)
          .set({ userId, deletedAt: now, updatedAt: now })
          .where(and(eq(profiles.id, guestId), isNull(profiles.userId)))
          .run();
        tx.delete(appMeta)
          .where(inArray(appMeta.key, ['guest_id', 'guest_active']))
          .run();
      });
    },

    async countGuestCheckIns() {
      const row = db
        .select({ total: count() })
        .from(checkIns)
        .where(and(isNull(checkIns.userId), isNull(checkIns.deletedAt)))
        .get();
      return row?.total ?? 0;
    },
  };
}
