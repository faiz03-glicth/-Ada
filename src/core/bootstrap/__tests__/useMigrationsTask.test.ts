import { renderHook, waitFor } from '@testing-library/react-native';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { getDb } from '@/core/db/client';

import { useMigrationsTask } from '../tasks/useMigrationsTask';

jest.mock('@/core/db/client', () => ({ getDb: jest.fn() }));
jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({ migrate: jest.fn() }));
jest.mock('@/core/db/migrations/migrations', () => ({
  __esModule: true,
  default: { journal: { entries: [] }, migrations: {} },
}));

const openDb = jest.mocked(getDb);
const runMigrations = jest.mocked(migrate);
const fakeDb = {} as ReturnType<typeof getDb>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useMigrationsTask', () => {
  it('opens the database at boot, not when the app loads, and is done once it is up to date', async () => {
    expect(openDb).not.toHaveBeenCalled();
    openDb.mockReturnValue(fakeDb);
    runMigrations.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMigrationsTask());

    await waitFor(() => expect(result.current).toEqual({ status: 'done' }));
    expect(openDb).toHaveBeenCalledTimes(1);
    expect(runMigrations).toHaveBeenCalledWith(fakeDb, expect.anything());
  });

  it('shows the boot error when the database cannot be opened', () => {
    openDb.mockImplementation(() => {
      throw new Error('disk I/O error');
    });

    const { result } = renderHook(() => useMigrationsTask());

    expect(result.current).toEqual({
      status: 'failed',
      title: 'Streak could not open its local database',
      detail: 'disk I/O error',
    });
    expect(runMigrations).not.toHaveBeenCalled();
  });

  it('shows the boot error when the database cannot be brought up to date', async () => {
    openDb.mockReturnValue(fakeDb);
    runMigrations.mockRejectedValue(new Error('no such table'));

    const { result } = renderHook(() => useMigrationsTask());

    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'failed',
        title: 'Streak could not update its local database',
        detail: 'no such table',
      }),
    );
  });
});
