import type { CheckInOwner, CheckInRepository } from '@/features/checkins/data/CheckInRepository';
import type { CheckIn, NewCheckIn } from '@/features/checkins/domain/CheckIn';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { mockFn } from './mockFn';

export type FakeCheckInRepository = jest.Mocked<CheckInRepository> & {
  /** Every stored check-in, removed ones included (for assertions). */
  rows: (CheckIn & { owner: CheckInOwner; removed: boolean })[];
};

type Repo = CheckInRepository;

export const testCheckIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  id: 'check-in-1',
  date: '2026-09-24' as ISODate,
  minute: 9 * 60,
  activityId: 'workout',
  note: '',
  createdAt: '2026-09-24T01:00:00.000Z',
  ...overrides,
});

/**
 * An in-memory check-in repository that behaves like the real one (soft deletes, per-owner lists), with
 * every method a jest.fn so tests can also make a write fail.
 */
export function createFakeCheckInRepository(
  seed: readonly CheckIn[] = [],
  owner: CheckInOwner = 'user-1',
): FakeCheckInRepository {
  let next = seed.length + 1;
  const rows: FakeCheckInRepository['rows'] = seed.map((checkIn) => ({ ...checkIn, owner, removed: false }));
  const strip = ({ owner: _owner, removed: _removed, ...checkIn }: FakeCheckInRepository['rows'][number]) =>
    checkIn;

  return {
    rows,
    list: mockFn<Repo['list']>(async (who) =>
      rows.filter((row) => row.owner === who && !row.removed).map(strip),
    ),
    add: mockFn<Repo['add']>(async (who, input: NewCheckIn) => {
      const checkIn: CheckIn = {
        ...input,
        id: `check-in-${next}`,
        createdAt: new Date(Date.UTC(2026, 8, 24, 12, 0, next)).toISOString(),
      };
      next += 1;
      rows.push({ ...checkIn, owner: who, removed: false });
      return checkIn;
    }),
    remove: mockFn<Repo['remove']>(async (id) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.removed = true;
    }),
    restore: mockFn<Repo['restore']>(async (id) => {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error('missing');
      row.removed = false;
      return strip(row);
    }),
    removeAll: mockFn<Repo['removeAll']>(async (who) => {
      const live = rows.filter((row) => row.owner === who && !row.removed);
      live.forEach((row) => (row.removed = true));
      return live.length;
    }),
  };
}
