import type { SupabaseClient } from '@supabase/supabase-js';

import { fromServerTime, secondsBefore } from '@/shared/lib/date/serverTime';

import { afterCursorFilter, createCheckInApi } from '../data/remote/checkInApi';

const KEY = '00000000-0000-4000-8000-000000000001';

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
    rpc: async (name: string, params: unknown) => (
      calls.push({ method: 'rpc', args: [name, params] }),
      result
    ),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const serverRow = {
  id: KEY,
  date: '2026-10-01',
  minute: 600,
  activity_id: 'walk',
  note: 'Run',
  created_at: '2026-10-01T10:00:00+00:00',
  updated_at: '2026-10-01T10:00:00.5+00:00',
  deleted_at: null,
  synced_at: '2026-10-04T10:00:00.123456+00:00',
};

describe('server times', () => {
  it("turns Postgres times into the app's form, microseconds and all", () => {
    expect(fromServerTime('2026-10-04T10:00:00.123456+00:00')).toBe('2026-10-04T10:00:00.123Z');
    expect(fromServerTime('2026-10-04T18:00:00+08:00')).toBe('2026-10-04T10:00:00.000Z');
    expect(fromServerTime('not a time')).toBeNull();
    expect(secondsBefore('2026-10-04T10:00:00.123456+00:00', 5)).toBe('2026-10-04T09:59:55.123Z');
  });
});

describe('checkInApi', () => {
  it('pushes through the push_check_ins function, never with an owner', async () => {
    const { client, calls } = fakeSupabase({});
    const row = {
      id: KEY,
      date: '2026-10-01',
      minute: 1,
      activity_id: 'walk',
      note: '',
      created_at: 'a',
      updated_at: 'b',
      deleted_at: null,
    };
    await createCheckInApi(client).push([row]);
    expect(calls).toEqual([{ method: 'rpc', args: ['push_check_ins', { rows: [row] }] }]);
  });

  it('pulls the account’s rows after the cursor, in order, as app rows', async () => {
    const { client, calls } = fakeSupabase({ data: [serverRow] });
    const page = await createCheckInApi(client).pull('user-1', { at: serverRow.synced_at, key: KEY }, 500);
    expect(calls.map((c) => c.method)).toEqual(['from', 'select', 'eq', 'order', 'order', 'limit', 'or']);
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual(['user_id', 'user-1']);
    expect(page.rows).toEqual([
      {
        id: KEY,
        date: '2026-10-01',
        minute: 600,
        activityId: 'walk',
        note: 'Run',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.500Z',
        deletedAt: null,
      },
    ]);
    // The bookmark stays exactly as the server wrote it.
    expect(page.next).toEqual({ at: '2026-10-04T10:00:00.123456+00:00', key: KEY });
  });

  it('refuses a response that is not the expected shape', async () => {
    const { client } = fakeSupabase({ data: [{ ...serverRow, minute: 5000 }] });
    await expect(createCheckInApi(client).pull('user-1', null, 500)).rejects.toMatchObject({
      code: 'Unknown',
    });
  });

  it('tells offline, refused and other failures apart', async () => {
    const offline = fakeSupabase({ error: { message: 'TypeError: Network request failed' } });
    await expect(createCheckInApi(offline.client).push([])).resolves.toBeUndefined();
    await expect(createCheckInApi(offline.client).pull('u', null, 1)).rejects.toMatchObject({
      code: 'Network',
    });

    const refused = { id: KEY } as never;
    for (const code of ['23514', '22P02', '42501']) {
      const { client } = fakeSupabase({ error: { message: 'bad', code } });
      await expect(createCheckInApi(client).push([refused])).rejects.toMatchObject({ code: 'Rejected' });
    }
    const { client } = fakeSupabase({ error: { message: 'JWT expired', code: 'PGRST301' } });
    await expect(createCheckInApi(client).push([refused])).rejects.toMatchObject({ code: 'Unknown' });
  });
});

describe('afterCursorFilter', () => {
  it('asks for later rows, and the same time with a later id', () => {
    expect(afterCursorFilter({ at: '2026-10-04T10:00:00.123456+00:00', key: KEY })).toBe(
      `synced_at.gt."2026-10-04T10:00:00.123456+00:00",and(synced_at.eq."2026-10-04T10:00:00.123456+00:00",id.gt.${KEY})`,
    );
  });

  it('refuses a cursor that could change the filter', () => {
    expect(() => afterCursorFilter({ at: '2026-10-04",id.neq.x', key: KEY })).toThrow();
    expect(() => afterCursorFilter({ at: '2026-10-04T10:00:00Z', key: 'x),or(id.gt.0' })).toThrow();
  });
});
