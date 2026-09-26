import type { ISODate } from '@/shared/lib/date/isoDate';

import type { CheckIn, NewCheckIn } from '../domain/CheckIn';
import type { CheckInDao, CheckInOwner } from './local/checkInDao';

export type { CheckInOwner } from './local/checkInDao';

/**
 * Check-ins live on the device (SQLite is the source of truth). Each write resolves only once it's stored,
 * so a caller never reports success for something that wasn't saved. Rows are marked for a future sync;
 * nothing here talks to a server.
 */
export interface CheckInRepository {
  list(owner: CheckInOwner): Promise<CheckIn[]>;
  add(owner: CheckInOwner, input: NewCheckIn): Promise<CheckIn>;
  /** Soft delete (Undo can bring it back). */
  remove(id: string): Promise<void>;
  /** Brings a removed check-in back, unchanged. */
  restore(id: string): Promise<CheckIn>;
  /** Removes every check-in the owner has; returns how many. */
  removeAll(owner: CheckInOwner): Promise<number>;
}

export interface LocalCheckInDeps {
  dao: CheckInDao;
  uuid: () => string;
  now: () => string;
}

function toCheckIn(row: {
  id: string;
  date: string;
  minute: number;
  activityId: string;
  note: string;
  createdAt: string;
}): CheckIn {
  return {
    id: row.id,
    date: row.date as ISODate,
    minute: row.minute,
    activityId: row.activityId,
    note: row.note,
    createdAt: row.createdAt,
  };
}

export class LocalCheckInRepository implements CheckInRepository {
  constructor(private readonly deps: LocalCheckInDeps) {}

  async list(owner: CheckInOwner): Promise<CheckIn[]> {
    return (await this.deps.dao.list(owner)).map(toCheckIn);
  }

  async add(owner: CheckInOwner, input: NewCheckIn): Promise<CheckIn> {
    const now = this.deps.now();
    const row = {
      ...input,
      id: this.deps.uuid(),
      userId: owner,
      createdAt: now,
      updatedAt: now,
      dirty: true,
    };
    await this.deps.dao.insert(row);
    return toCheckIn(row);
  }

  async remove(id: string): Promise<void> {
    await this.deps.dao.softDelete(id, this.deps.now());
  }

  async restore(id: string): Promise<CheckIn> {
    await this.deps.dao.restore(id, this.deps.now());
    const row = await this.deps.dao.getById(id);
    if (!row) throw new Error('Check-in missing after restore');
    return toCheckIn(row);
  }

  removeAll(owner: CheckInOwner): Promise<number> {
    return this.deps.dao.softDeleteAll(owner, this.deps.now());
  }
}
