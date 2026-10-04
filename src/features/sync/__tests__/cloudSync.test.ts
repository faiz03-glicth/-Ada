import { AppError } from '@/core/errors/AppError';
import { LocalCheckInRepository } from '@/features/checkins/data/CheckInRepository';
import { createCheckInDao } from '@/features/checkins/data/local/checkInDao';
import type { CheckInApi, PulledPage, PushedCheckIn } from '@/features/checkins/data/remote/checkInApi';
import { createWorkoutDayDao } from '@/features/training/data/local/workoutDayDao';
import type { WorkoutDayApi } from '@/features/training/data/remote/workoutDayApi';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { createTestDatabase } from '@test/db/createTestDatabase';

import { createSyncStateDao } from '../data/local/syncStateDao';
import { CloudSync, PULL_PAGE, PUSH_BATCH, type SyncProgress } from '../data/SyncRepository';

const USER = 'user-1';
const day = (value: string) => value as ISODate;

interface ServerRow extends PushedCheckIn {
  user_id: string;
  synced_at: string;
}

/**
 * A stand-in for Supabase with the same rules as 0003_check_ins.sql: the caller owns what it pushes, the
 * newest edit wins (an older or equal one is ignored), and every accepted write gets a later synced_at.
 */
function createFakeServer() {
  const rows = new Map<string, ServerRow>();
  let clock = 0;
  const stamp = () => new Date(Date.UTC(2026, 9, 4, 10, 0, 0) + (clock += 1) * 1000).toISOString();
  const state = {
    offline: false,
    refuse: (_row: PushedCheckIn) => false,
    beforePush: async () => undefined as void,
    pushes: [] as number[],
  };

  const api: CheckInApi = {
    async push(batch) {
      await state.beforePush();
      if (state.offline) throw new AppError('Network', 'Network request failed');
      if (batch.some((row) => state.refuse(row))) throw new AppError('Rejected', 'refused (23514)');
      state.pushes.push(batch.length);
      for (const row of batch) {
        const stored = rows.get(row.id);
        if (stored && row.updated_at <= stored.updated_at) continue;
        rows.set(row.id, { ...row, user_id: USER, synced_at: stamp() });
      }
    },
    async pull(userId, after, limit): Promise<PulledPage> {
      if (state.offline) throw new AppError('Network', 'Network request failed');
      const page = [...rows.values()]
        .filter((row) => row.user_id === userId)
        .filter(
          (row) => !after || row.synced_at > after.at || (row.synced_at === after.at && row.id > after.key),
        )
        .sort((a, b) => a.synced_at.localeCompare(b.synced_at) || a.id.localeCompare(b.id))
        .slice(0, limit);
      const last = page.at(-1);
      return {
        rows: page.map((row) => ({
          id: row.id,
          date: row.date,
          minute: row.minute,
          activityId: row.activity_id,
          note: row.note,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        })),
        next: last ? { at: last.synced_at, key: last.id } : null,
      };
    },
  };

  /** A check-in written by another phone of the same account. */
  const fromOtherPhone = (id: string, updatedAt: string, changes: Partial<PushedCheckIn> = {}) => {
    rows.set(id, {
      id,
      date: '2026-10-01',
      minute: 600,
      activity_id: 'walk',
      note: '',
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: updatedAt,
      deleted_at: null,
      ...changes,
      user_id: USER,
      synced_at: stamp(),
    });
  };

  return { api, rows, state, fromOtherPhone };
}

interface TerasRow {
  user_id: string;
  date: string;
  sets: number;
  updated_at: string;
}

/**
 * A stand-in for Teras's `workout_days`: one row per account and day, which Teras keeps updating (a day whose
 * sets are all removed keeps its row, with 0 sets), each save stamped with a later updated_at. Pulls answer
 * the way Streak asks: the date, and whether the day had a workout.
 */
function createFakeTeras() {
  const rows = new Map<string, TerasRow>();
  let clock = 0;
  const stamp = () => new Date(Date.UTC(2026, 9, 4, 12, 0, 0) + (clock += 1) * 1000).toISOString();
  const state = { offline: false, failure: null as Error | null, pulls: 0 };

  const api: WorkoutDayApi = {
    async pull(userId, after, limit) {
      state.pulls += 1;
      if (state.offline) throw new AppError('Network', 'Network request failed');
      if (state.failure) throw state.failure;
      const page = [...rows.values()]
        .filter((row) => row.user_id === userId)
        .filter(
          (row) =>
            !after || row.updated_at > after.at || (row.updated_at === after.at && row.date > after.key),
        )
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.date.localeCompare(b.date))
        .slice(0, limit);
      const last = page.at(-1);
      return {
        days: page.map((row) => ({ date: row.date, workedOut: row.sets > 0 })),
        next: last ? { at: last.updated_at, key: last.date } : null,
      };
    },
  };

  /** Teras saves an account's day: its completed sets (0 once they've all been removed). */
  const save = (date: string, sets: number, userId = USER) => {
    rows.set(`${userId}/${date}`, { user_id: userId, date, sets, updated_at: stamp() });
  };

  return { api, state, save };
}

async function setup() {
  const db = await createTestDatabase();
  const dao = createCheckInDao(db);
  let id = 0;
  let clock = 0;
  const repository = new LocalCheckInRepository({
    dao,
    uuid: () => `00000000-0000-4000-8000-${String((id += 1)).padStart(12, '0')}`,
    now: () => new Date(Date.UTC(2026, 9, 1, 12, 0, 0) + (clock += 1) * 1000).toISOString(),
  });
  const server = createFakeServer();
  const teras = createFakeTeras();
  const state = createSyncStateDao(db);
  const workoutDays = createWorkoutDayDao(db);
  const sync = new CloudSync({
    checkIns: dao,
    checkInApi: server.api,
    workoutDays,
    workoutDayApi: teras.api,
    state,
    yieldToApp: async () => undefined,
  });
  const add = (owner: string | null, note = '') =>
    repository.add(owner, { date: day('2026-10-01'), minute: 600, activityId: 'walk', note });
  return { db, dao, repository, server, teras, workoutDays, state, sync, add };
}

describe('CloudSync: push', () => {
  it('sends the account’s waiting check-ins in batches, then marks them sent', async () => {
    const { sync, add, server, dao } = await setup();
    for (let i = 0; i < PUSH_BATCH * 2 + 50; i += 1) await add(USER);
    const progress: SyncProgress[] = [];

    const result = await sync.run(USER, { onProgress: (p) => progress.push(p) });

    expect(server.state.pushes).toEqual([PUSH_BATCH, PUSH_BATCH, 50]);
    expect(result).toEqual({ pushed: 450, changed: 0, workoutDaysChanged: 0, refused: 0, complete: true });
    expect(await dao.countDirty(USER, [])).toBe(0);
    expect(progress.filter((p) => p.step === 'backingUp').map((p) => p.done)).toEqual([0, 200, 400, 450]);
    expect(progress.at(-1)).toEqual({ step: 'updating', done: 0, total: 0 });
  });

  it("never sends a guest's check-ins or another account's", async () => {
    const { sync, add, server } = await setup();
    await add(null);
    await add('user-2');
    await add(USER);
    await sync.run(USER);
    expect([...server.rows.values()].map((row) => row.id)).toHaveLength(1);
  });

  it('keeps a check-in deleted during its upload waiting, and sends the deletion in the next batch', async () => {
    const { sync, add, server, repository, dao } = await setup();
    const checkIn = await add(USER);
    server.state.beforePush = async () => {
      server.state.beforePush = async () => undefined;
      await repository.remove(checkIn.id);
    };

    await sync.run(USER);

    // The first upload carried the version from before the delete, so the row stayed waiting.
    expect(server.state.pushes).toEqual([1, 1]);
    expect(server.rows.get(checkIn.id)?.deleted_at).not.toBeNull();
    expect(await dao.countDirty(USER, [])).toBe(0);
  });

  it('sets aside only the check-in the server refuses, and sends the rest', async () => {
    const { sync, add, server, dao } = await setup();
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const bad = await add(USER, 'bad');
    for (let i = 0; i < 9; i += 1) await add(USER);
    server.state.refuse = (row) => row.id === bad.id;

    const result = await sync.run(USER);

    expect(result).toMatchObject({ pushed: 9, refused: 1, complete: true });
    expect(server.rows.has(bad.id)).toBe(false);
    expect(server.rows.size).toBe(9);
    expect(await dao.countDirty(USER, [])).toBe(1);
    // Not re-sent on every run in this session.
    const pushesBefore = server.state.pushes.length;
    await sync.run(USER);
    expect(server.state.pushes.length).toBe(pushesBefore);
    expect(error).toHaveBeenCalledWith(expect.not.stringContaining('bad'));
    error.mockRestore();
  });

  it('cleans old notes on the way out, so the server always accepts them', async () => {
    const { sync, server, dao } = await setup();
    await dao.insert({
      id: '00000000-0000-4000-8000-0000000000aa',
      userId: USER,
      date: '2026-09-01',
      minute: 1,
      activityId: 'walk',
      note: 'two\nlines',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      dirty: true,
    });
    await sync.run(USER);
    expect(server.rows.get('00000000-0000-4000-8000-0000000000aa')?.note).toBe('two lines');
  });

  it('stops offline with everything still waiting, and carries on when back online', async () => {
    const { sync, add, server, dao } = await setup();
    await add(USER);
    server.state.offline = true;
    await expect(sync.run(USER)).rejects.toMatchObject({ code: 'Network' });
    expect(await dao.countDirty(USER, [])).toBe(1);

    server.state.offline = false;
    await sync.run(USER);
    expect(await dao.countDirty(USER, [])).toBe(0);
  });

  it('stops between batches when asked (the app went to the background), and resumes', async () => {
    const { sync, add, server, dao } = await setup();
    for (let i = 0; i < PUSH_BATCH + 1; i += 1) await add(USER);
    const result = await sync.run(USER, { shouldContinue: () => false });
    expect(result).toMatchObject({ pushed: PUSH_BATCH, complete: false });
    expect(await dao.countDirty(USER, [])).toBe(1);

    await sync.run(USER);
    expect(server.rows.size).toBe(PUSH_BATCH + 1);
  });
});

describe('CloudSync: pull', () => {
  it("brings in the account's check-ins from other phones, deletions included", async () => {
    const { sync, server, repository } = await setup();
    server.fromOtherPhone('00000000-0000-4000-8000-0000000000b1', '2026-10-02T08:00:00.000Z', {
      note: 'Run',
    });
    server.fromOtherPhone('00000000-0000-4000-8000-0000000000b2', '2026-10-02T09:00:00.000Z', {
      deleted_at: '2026-10-02T09:00:00.000Z',
    });

    const result = await sync.run(USER);

    expect(result.changed).toBe(2);
    expect((await repository.list(USER)).map((c) => c.note)).toEqual(['Run']);
    // A second run finds nothing new, although it looks a few seconds back.
    expect((await sync.run(USER)).changed).toBe(0);
  });

  it('reads every page, and remembers where it got to per account', async () => {
    const { sync, server, repository, state } = await setup();
    for (let i = 0; i < PULL_PAGE + 20; i += 1) {
      server.fromOtherPhone(
        `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        '2026-10-02T08:00:00.000Z',
      );
    }
    await sync.run(USER);
    expect(await repository.list(USER)).toHaveLength(PULL_PAGE + 20);
    expect(await state.getCursor(USER, 'check_ins')).not.toBeNull();
    expect(await state.getCursor('user-2', 'check_ins')).toBeNull();
  });

  it('lets the newest edit win: a newer one from elsewhere replaces an unsent older one here', async () => {
    const { sync, server, repository, add } = await setup();
    const mine = await add(USER, 'mine');
    await sync.run(USER);
    // This phone deletes it (unsent: offline); another phone edits it later.
    server.state.offline = true;
    await repository.remove(mine.id);
    server.fromOtherPhone(mine.id, '2099-01-01T00:00:00.000Z', { note: 'theirs', date: '2026-10-01' });
    server.state.offline = false;

    await sync.run(USER);

    expect((await repository.list(USER)).map((c) => c.note)).toEqual(['theirs']);
  });

  it('keeps an unsent newer edit here over an older one from elsewhere, and sends it', async () => {
    const { sync, server, repository, add } = await setup();
    const mine = await add(USER, 'mine');
    await sync.run(USER);
    server.fromOtherPhone(mine.id, '2000-01-01T00:00:00.000Z', { note: 'stale' });
    await repository.remove(mine.id);

    await sync.run(USER);

    expect(await repository.list(USER)).toEqual([]);
    expect(server.rows.get(mine.id)?.deleted_at).not.toBeNull();
  });

  it("never touches a guest's check-in that happens to share an id", async () => {
    const { sync, server, repository, add } = await setup();
    const guests = await add(null, 'guest');
    server.fromOtherPhone(guests.id, '2099-01-01T00:00:00.000Z', { note: 'account' });
    await sync.run(USER);
    expect((await repository.list(null)).map((c) => c.note)).toEqual(['guest']);
  });
});

describe('CloudSync: workout days from Teras', () => {
  const dateAt = (i: number) => new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10);

  it('brings in the days the account worked out, and nothing for anyone else', async () => {
    const { sync, teras, workoutDays } = await setup();
    teras.save('2026-10-01', 12);
    teras.save('2026-10-02', 0);
    teras.save('2026-10-03', 5, 'user-2');

    const result = await sync.run(USER);

    expect(result).toEqual({ pushed: 0, changed: 0, workoutDaysChanged: 1, refused: 0, complete: true });
    expect(await workoutDays.list(USER)).toEqual(['2026-10-01']);
    expect(await workoutDays.list('user-2')).toEqual([]);
  });

  it('drops a day once its sets have all been removed in Teras', async () => {
    const { sync, teras, workoutDays } = await setup();
    teras.save('2026-10-01', 12);
    await sync.run(USER);
    teras.save('2026-10-01', 0);

    expect((await sync.run(USER)).workoutDaysChanged).toBe(1);
    expect(await workoutDays.list(USER)).toEqual([]);
  });

  it('reads every page and keeps its own bookmark, then looks a few seconds back', async () => {
    const { sync, teras, workoutDays, state } = await setup();
    for (let i = 0; i < PULL_PAGE + 5; i += 1) teras.save(dateAt(i), 3);

    expect((await sync.run(USER)).workoutDaysChanged).toBe(PULL_PAGE + 5);
    expect(await workoutDays.list(USER)).toHaveLength(PULL_PAGE + 5);
    expect(await state.getCursor(USER, 'workout_days')).toEqual({
      at: expect.any(String),
      key: dateAt(PULL_PAGE + 4),
    });
    expect(await state.getCursor(USER, 'check_ins')).toBeNull();

    const pulls = teras.state.pulls;
    expect((await sync.run(USER)).workoutDaysChanged).toBe(0);
    expect(teras.state.pulls).toBe(pulls + 1);
  });

  it('stops between pages when asked, and carries on next run', async () => {
    const { sync, teras, workoutDays } = await setup();
    for (let i = 0; i < PULL_PAGE + 1; i += 1) teras.save(dateAt(i), 3);

    const result = await sync.run(USER, { shouldContinue: () => false });
    expect(result).toMatchObject({ workoutDaysChanged: PULL_PAGE, complete: false });

    await sync.run(USER);
    expect(await workoutDays.list(USER)).toHaveLength(PULL_PAGE + 1);
  });

  it("carries on with check-ins when Teras's table isn't there, and stops asking until the app restarts", async () => {
    const { sync, teras, add, server } = await setup();
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await add(USER);
    teras.state.failure = new AppError('Unavailable', "Workout days can't be read (PGRST205)");

    const result = await sync.run(USER);

    expect(result).toEqual({ pushed: 1, changed: 0, workoutDaysChanged: 0, refused: 0, complete: true });
    expect(server.rows.size).toBe(1);
    expect(error).toHaveBeenCalledWith("[sync] Workout days can't be read (PGRST205)");
    await sync.run(USER);
    expect(teras.state.pulls).toBe(1);
    error.mockRestore();
  });

  it('tries again next run after any other failure', async () => {
    const { sync, teras, workoutDays } = await setup();
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    teras.save('2026-10-01', 4);
    teras.state.failure = new AppError('Unknown', 'Workout days request failed (no code)');
    expect((await sync.run(USER)).complete).toBe(true);
    expect(await workoutDays.list(USER)).toEqual([]);

    teras.state.failure = null;
    await sync.run(USER);
    expect(await workoutDays.list(USER)).toEqual(['2026-10-01']);
    error.mockRestore();
  });

  it('stops offline like the rest of sync, after the check-ins are sent', async () => {
    const { sync, teras, add, server } = await setup();
    await add(USER);
    teras.state.offline = true;
    await expect(sync.run(USER)).rejects.toMatchObject({ code: 'Network' });
    expect(server.rows.size).toBe(1);
  });
});
