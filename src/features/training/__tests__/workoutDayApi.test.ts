import type { SupabaseClient } from '@supabase/supabase-js';

import { afterWorkoutDayFilter, createWorkoutDayApi } from '../data/remote/workoutDayApi';

/** Just enough of supabase-js: records the calls and answers with `response`. */
function fakeSupabase(response: { data?: unknown; error?: { message: string; code?: string } | null }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const result = { data: response.data ?? null, error: response.error ?? null };
  const query = {
    select: (...args: unknown[]) => (calls.push({ method: 'select', args }), query),
    eq: (...args: unknown[]) => (calls.push({ method: 'eq', args }), query),
    order: (...args: unknown[]) => (calls.push({ method: 'order', args }), query),
    limit: (...args: unknown[]) => (calls.push({ method: 'limit', args }), query),
    or: (...args: unknown[]) => (calls.push({ method: 'or', args }), query),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  const client = {
    from: (table: string) => (calls.push({ method: 'from', args: [table] }), query),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const AT = '2026-10-04T10:00:00.123456+00:00';
const serverRow = { date: '2026-10-01', updated_at: AT, worked_out: true };

describe('workoutDayApi', () => {
  it('asks Teras’s table only for the date, whether it was a workout day, and when it changed', async () => {
    const { client, calls } = fakeSupabase({ data: [serverRow] });
    await createWorkoutDayApi(client).pull('user-1', null, 500);

    expect(calls).toEqual([
      { method: 'from', args: ['workout_days'] },
      { method: 'select', args: ['date,updated_at,worked_out:sets::boolean'] },
      { method: 'eq', args: ['user_id', 'user-1'] },
      { method: 'order', args: ['updated_at', { ascending: true }] },
      { method: 'order', args: ['date', { ascending: true }] },
      { method: 'limit', args: [500] },
    ]);
  });

  it('pulls the days after the cursor as dates, keeping the bookmark exactly as the server wrote it', async () => {
    const { client, calls } = fakeSupabase({
      data: [serverRow, { date: '2026-10-02', updated_at: AT, worked_out: false }],
    });
    const page = await createWorkoutDayApi(client).pull('user-1', { at: AT, key: '2026-09-30' }, 500);

    expect(calls.at(-1)).toEqual({
      method: 'or',
      args: [afterWorkoutDayFilter({ at: AT, key: '2026-09-30' })],
    });
    expect(page.days).toEqual([
      { date: '2026-10-01', workedOut: true },
      { date: '2026-10-02', workedOut: false },
    ]);
    expect(page.next).toEqual({ at: AT, key: '2026-10-02' });
  });

  it('keeps nothing else the server might send about a workout', async () => {
    const { client } = fakeSupabase({ data: [{ ...serverRow, sets: 12, volume_kg: 4250, level: 3 }] });
    const page = await createWorkoutDayApi(client).pull('user-1', null, 500);
    expect(page.days).toEqual([{ date: '2026-10-01', workedOut: true }]);
  });

  it('says there is no next page for an empty one', async () => {
    const { client } = fakeSupabase({ data: [] });
    expect(await createWorkoutDayApi(client).pull('user-1', null, 500)).toEqual({ days: [], next: null });
  });

  it('refuses a response that is not the expected shape', async () => {
    for (const row of [
      { ...serverRow, worked_out: 1 },
      { ...serverRow, date: '1 Oct 2026' },
      { ...serverRow, updated_at: 'soon' },
    ]) {
      const { client } = fakeSupabase({ data: [row] });
      await expect(createWorkoutDayApi(client).pull('user-1', null, 500)).rejects.toMatchObject({
        code: 'Unknown',
      });
    }
  });

  it('tells offline, a table that isn’t there, and other failures apart', async () => {
    const offline = fakeSupabase({ error: { message: 'TypeError: Network request failed' } });
    await expect(createWorkoutDayApi(offline.client).pull('u', null, 1)).rejects.toMatchObject({
      code: 'Network',
    });

    for (const code of ['PGRST205', '42P01', '42501', '42703']) {
      const { client } = fakeSupabase({ error: { message: 'missing', code } });
      await expect(createWorkoutDayApi(client).pull('u', null, 1)).rejects.toMatchObject({
        code: 'Unavailable',
        message: `Workout days can't be read (${code})`,
      });
    }

    const { client } = fakeSupabase({ error: { message: 'Service Unavailable' } });
    await expect(createWorkoutDayApi(client).pull('u', null, 1)).rejects.toMatchObject({
      code: 'Unknown',
      message: 'Workout days request failed (no code)',
    });
  });
});

describe('afterWorkoutDayFilter', () => {
  it('asks for later changes, and the same time with a later date', () => {
    expect(afterWorkoutDayFilter({ at: AT, key: '2026-10-01' })).toBe(
      `updated_at.gt."${AT}",and(updated_at.eq."${AT}",date.gt.2026-10-01)`,
    );
  });

  it('refuses a cursor that could change the filter', () => {
    expect(() => afterWorkoutDayFilter({ at: '2026-10-04",date.neq.x', key: '2026-10-01' })).toThrow();
    expect(() => afterWorkoutDayFilter({ at: AT, key: '2026-10-01),or(date.gt.0' })).toThrow();
  });
});
