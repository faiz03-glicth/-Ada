import { onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { checkInsQueryKey } from '@/features/checkins/hooks/useCheckIns';
import { showInfo } from '@/shared/ui/toast';
import { testUser } from '@test/fakes/fakeRepositories';
import { createWrapper } from '@test/providers';

import { SYNC_AFTER_CHANGE_MS, useBackgroundSync } from '../hooks/useBackgroundSync';
import { useSyncPreferencesStore } from '../state/syncPreferencesStore';
import { requestSync } from '../state/syncRequests';
import { useSyncStatusStore } from '../state/syncStatusStore';

jest.mock('@/shared/ui/toast', () => ({ ...jest.requireActual('@/shared/ui/toast'), showInfo: jest.fn() }));

const done = { pushed: 0, changed: 0, refused: 0, complete: true };

function setup() {
  const { Wrapper, repositories, queryClient } = createWrapper();
  const view = renderHook(() => useBackgroundSync(), { wrapper: Wrapper });
  return { ...view, sync: repositories.sync, queryClient };
}

beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
  useSyncPreferencesStore.setState({ enabled: true });
  useSyncStatusStore.setState({ status: { kind: 'idle', refused: 0 } });
  useAuthStore.getState().setUser(testUser());
});

afterEach(() => {
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

describe('useBackgroundSync', () => {
  it('syncs a signed-in account straight away', async () => {
    const { sync } = setup();
    await waitFor(() => expect(sync.run).toHaveBeenCalledWith('user-1', expect.any(Object)));
    expect(useSyncStatusStore.getState().status).toEqual({ kind: 'idle', refused: 0 });
  });

  it('never syncs a guest', async () => {
    useAuthStore.getState().setUser(testUser({ id: 'guest-1', provider: 'guest', email: null }));
    const { sync } = setup();
    await act(async () => undefined);
    expect(sync.run).not.toHaveBeenCalled();
  });

  it('does nothing while the switch is off, and starts when it is turned on', async () => {
    useSyncPreferencesStore.setState({ enabled: false });
    const { sync } = setup();
    await act(async () => undefined);
    expect(sync.run).not.toHaveBeenCalled();

    act(() => useSyncPreferencesStore.getState().setEnabled(true));
    await waitFor(() => expect(sync.run).toHaveBeenCalledTimes(1));
  });

  it('waits offline, and syncs when the phone is back online', async () => {
    onlineManager.setOnline(false);
    const { sync } = setup();
    await act(async () => undefined);
    expect(sync.run).not.toHaveBeenCalled();
    expect(useSyncStatusStore.getState().status).toEqual({ kind: 'waiting' });

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(sync.run).toHaveBeenCalledTimes(1));
  });

  it('sends a burst of check-in changes in one run, a few seconds after the last', async () => {
    jest.useFakeTimers();
    const { sync } = setup();
    await act(async () => undefined);
    expect(sync.run).toHaveBeenCalledTimes(1);

    act(() => {
      requestSync();
      requestSync();
      jest.advanceTimersByTime(SYNC_AFTER_CHANGE_MS - 1);
      requestSync();
    });
    expect(sync.run).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(SYNC_AFTER_CHANGE_MS);
    });
    expect(sync.run).toHaveBeenCalledTimes(2);
  });

  it('refreshes what every screen shows only when the pull changed something', async () => {
    const { Wrapper, repositories, queryClient } = createWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    repositories.sync.run.mockResolvedValueOnce({ ...done, changed: 3 });
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: checkInsQueryKey('user-1') }));
  });

  it('says when a big upload is done', async () => {
    const { Wrapper, repositories } = createWrapper();
    repositories.sync.run.mockResolvedValueOnce({ ...done, pushed: 120 });
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(showInfo).toHaveBeenCalledWith({
        title: 'Your check-ins are backed up',
        sub: '120 check-ins sent to your account.',
      }),
    );
  });

  it('shows a failure without logging any check-in data, and tries again on the next change', async () => {
    jest.useFakeTimers();
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { Wrapper, repositories } = createWrapper();
    repositories.sync.run.mockRejectedValueOnce(new Error('boom'));
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });
    await act(async () => undefined);
    expect(useSyncStatusStore.getState().status).toEqual({ kind: 'failed' });
    expect(error).toHaveBeenCalledWith('[sync] Sync failed (Error)');

    await act(async () => {
      requestSync();
      jest.advanceTimersByTime(SYNC_AFTER_CHANGE_MS);
    });
    expect(repositories.sync.run).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
