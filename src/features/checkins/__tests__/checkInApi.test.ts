import type { SupabaseClient } from '@supabase/supabase-js';

import { fromServerTime, secondsBefore } from '@/shared/lib/date/serverTime';

import { afterCursorFilter, createCheckInApi } from '../data/remote/checkInApi';

const KEY = '00000000-0000-4000-8000-000000000001';
const KEY2 = '00000000-0000-4000-8000-000000000002';
const KEY3 = '00000000-0000-4000-8000-000000000003';

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
  it('pushes through the push_check_ins function, naming the account the rows are for', async () => {
    const { client, calls } = fakeSupabase({});
    const row = {
      id: KEY,
      user_id: 'user-1',
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

  it("leaves out rows it can't read, keeps the rest, and still moves the bookmark past them", async () => {
    const later = { ...serverRow, id: KEY2, synced_at: '2026-10-04T10:00:01.000001+00:00' };
    const { client } = fakeSupabase({
      data: [
        { ...serverRow, minute: 5000 },
        { ...serverRow, id: KEY3 },
        { ...later, created_at: 'infinity' },
      ],
    });
    const page = await createCheckInApi(client).pull('user-1', null, 500);

    expect(page.rows.map((row) => row.id)).toEqual([KEY3]);
    expect(page.skipped).toBe(2);
    expect(page.next).toEqual({ at: later.synced_at, key: KEY2 });
  });

  it('refuses a response that is not a list', async () => {
    const { client } = fakeSupabase({ data: { rows: [] } });
    await expect(createCheckInApi(client).pull('user-1', null, 500)).rejects.toMatchObject({
      code: 'Unknown',
    });
  });

  it('tells offline, refused rows, and a refused session apart', async () => {
    const offline = fakeSupabase({ error: { message: 'TypeError: Network request failed' } });
    await expect(createCheckInApi(offline.client).push([])).resolves.toBeUndefined();
    await expect(createCheckInApi(offline.client).pull('u', null, 1)).rejects.toMatchObject({
      code: 'Network',
    });

    const refused = { id: KEY } as never;
    // The rows themselves: sending them again would fail again.
    for (const [code, message] of [
      ['23514', 'new row violates check constraint "check_ins_note_valid"'],
      ['22P02', 'invalid input syntax for type uuid'],
      ['42501', 'new row violates row-level security policy for table "check_ins"'],
    ] as const) {
      const { client } = fakeSupabase({ error: { message, code } });
      await expect(createCheckInApi(client).push([refused])).rejects.toMatchObject({ code: 'Rejected' });
    }
    // Not the rows: no session, another account's session, an expired token. The run stops instead.
    for (const [code, message] of [
      ['42501', 'permission denied for function push_check_ins'],
      ['42501', 'push_check_ins: check-ins for another account'],
      ['PGRST301', 'JWT expired'],
    ] as const) {
      const { client } = fakeSupabase({ error: { message, code } });
      await expect(createCheckInApi(client).push([refused])).rejects.toMatchObject({ code: 'Unknown' });
    }
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
