import { workoutDays } from '@/core/db/schema';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { createWorkoutDayDao } from '../data/local/workoutDayDao';
import { LocalTrainingRepository } from '../data/TrainingRepository';

const USER = 'user-1';

async function setup() {
  const db = await createTestDatabase();
  const dao = createWorkoutDayDao(db);
  return { db, dao, repository: new LocalTrainingRepository(dao) };
}

describe('workout days on the phone', () => {
  it('keeps the days worked out, and only their dates', async () => {
    const { db, dao } = await setup();
    const changed = await dao.applyPulled(USER, [
      { date: '2026-10-03', workedOut: true },
      { date: '2026-10-01', workedOut: true },
      // A day Teras stored with no completed sets: nothing to show.
      { date: '2026-10-02', workedOut: false },
    ]);

    expect(changed).toBe(2);
    expect(await dao.list(USER)).toEqual(['2026-10-01', '2026-10-03']);
    expect(db.select().from(workoutDays).all()).toEqual([
      { userId: USER, date: '2026-10-03' },
      { userId: USER, date: '2026-10-01' },
    ]);
  });

  it('drops a day whose sets were all removed in Teras, and adds it back when it is trained again', async () => {
    const { dao } = await setup();
    await dao.applyPulled(USER, [{ date: '2026-10-01', workedOut: true }]);

    expect(await dao.applyPulled(USER, [{ date: '2026-10-01', workedOut: false }])).toBe(1);
    expect(await dao.list(USER)).toEqual([]);

    expect(await dao.applyPulled(USER, [{ date: '2026-10-01', workedOut: true }])).toBe(1);
    expect(await dao.list(USER)).toEqual(['2026-10-01']);
  });

  it('counts nothing when a pull repeats what the phone already has', async () => {
    const { dao } = await setup();
    const days = [
      { date: '2026-10-01', workedOut: true },
      { date: '2026-10-02', workedOut: false },
    ];
    await dao.applyPulled(USER, days);
    expect(await dao.applyPulled(USER, days)).toBe(0);
    expect(await dao.applyPulled(USER, [])).toBe(0);
  });

  it("keeps each account's days apart", async () => {
    const { dao } = await setup();
    await dao.applyPulled(USER, [{ date: '2026-10-01', workedOut: true }]);
    await dao.applyPulled('user-2', [{ date: '2026-10-01', workedOut: false }]);
    await dao.applyPulled('user-2', [{ date: '2026-10-05', workedOut: true }]);

    expect(await dao.list(USER)).toEqual(['2026-10-01']);
    expect(await dao.list('user-2')).toEqual(['2026-10-05']);
  });

  it('hands screens real calendar days only', async () => {
    const { db, repository } = await setup();
    db.insert(workoutDays)
      .values([
        { userId: USER, date: '2026-10-01' },
        { userId: USER, date: '2026-02-30' },
      ])
      .run();
    expect(await repository.listWorkoutDays(USER)).toEqual(['2026-10-01']);
  });
});
