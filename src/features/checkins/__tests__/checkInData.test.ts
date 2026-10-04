import { createGuestDataDao } from '@/features/auth/data/local/guestDataDao';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { LocalCheckInRepository } from '../data/CheckInRepository';
import { createCheckInDao } from '../data/local/checkInDao';

const day = (value: string) => value as ISODate;

async function setup() {
  const db = await createTestDatabase();
  let id = 0;
  let clock = 0;
  const repository = new LocalCheckInRepository({
    dao: createCheckInDao(db),
    uuid: () => `id-${(id += 1)}`,
    now: () => new Date(Date.UTC(2026, 8, 24, 12, 0, (clock += 1))).toISOString(),
  });
  return { db, repository };
}

const input = { date: day('2026-09-24'), minute: 600, activityId: 'workout', note: 'Leg day' };

describe('check-ins on the device (real SQLite, real migrations)', () => {
  it('stores check-ins per owner and lists them in time order', async () => {
    const { repository } = await setup();
    await repository.add('user-1', { ...input, minute: 900 });
    await repository.add('user-1', { ...input, date: day('2026-09-23') });
    await repository.add('user-2', input);
    await repository.add(null, input);

    const mine = await repository.list('user-1');
    expect(mine.map((c) => [c.date, c.minute])).toEqual([
      ['2026-09-23', 600],
      ['2026-09-24', 900],
    ]);
    expect(await repository.list('user-2')).toHaveLength(1);
    expect(await repository.list(null)).toHaveLength(1);
  });

  it('soft-deletes and restores (Undo), and deletes everything for one owner only', async () => {
    const { repository } = await setup();
    const saved = await repository.add('user-1', input);
    await repository.add('user-1', input);
    await repository.add('user-2', input);

    await repository.remove(saved.id);
    expect(await repository.list('user-1')).toHaveLength(1);
    expect(await repository.restore(saved.id)).toMatchObject({ id: saved.id, note: 'Leg day' });
    expect(await repository.list('user-1')).toHaveLength(2);

    expect(await repository.removeAll('user-1')).toBe(2);
    expect(await repository.list('user-1')).toEqual([]);
    expect(await repository.list('user-2')).toHaveLength(1);
  });

  it("counts only the guest's live check-ins (for the offer after a sign-in)", async () => {
    const { db, repository } = await setup();
    await repository.add(null, input);
    const deleted = await repository.add(null, input);
    await repository.remove(deleted.id);
    await repository.add('user-1', input);
    expect(await createGuestDataDao(db).countGuestCheckIns()).toBe(1);
  });

  it("hands a guest's check-ins to the account they sign in with", async () => {
    const { db, repository } = await setup();
    await repository.add(null, input);
    await createGuestDataDao(db).reassignGuestData('guest-1', 'user-9', '2026-09-24T13:00:00.000Z');
    expect(await repository.list(null)).toEqual([]);
    expect(await repository.list('user-9')).toHaveLength(1);
  });

  it('never hands over a check-in the guest deleted: it stays behind, deleted', async () => {
    const { db, repository } = await setup();
    await repository.add(null, input);
    const deleted = await repository.add(null, { ...input, note: 'Deleted' });
    await repository.remove(deleted.id);

    await createGuestDataDao(db).reassignGuestData('guest-1', 'user-9', '2026-09-24T13:00:00.000Z');

    const dao = createCheckInDao(db);
    expect(await repository.list('user-9')).toHaveLength(1);
    expect(await dao.countDirty('user-9', [])).toBe(1);
    expect(await dao.getById(deleted.id)).toMatchObject({ userId: null, note: 'Deleted' });
  });
});
