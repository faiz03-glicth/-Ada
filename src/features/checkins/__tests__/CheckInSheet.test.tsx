import type { FakeableAPI } from '@jest/fake-timers';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { goBack } from '@/shared/actions';
import { longDate } from '@/shared/lib/format/dates';
import { testUser } from '@test/fakes/fakeRepositories';
import { checkInDaysAgo, daysAgo, repositoriesWith, today } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { CheckInSheet } from '../ui/CheckInSheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

/** Everything but Date, for tests that move the clock without running timers. */
const REAL_TIMERS: FakeableAPI[] = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
];

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().setUser(testUser());
});

describe.each(SCHEMES)('Check-in sheet in %s', (scheme) => {
  it('checks in: stored first, then the sheet closes and the toast confirms', async () => {
    const repositories = repositoriesWith([checkInDaysAgo(0)]);
    renderWithApp(<CheckInSheet date={null} />, { scheme, repositories });

    // Today already has one, so the preview shows where it goes next.
    expect(await screen.findByText('Today goes to 2 check-ins · Moderate')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Reading' }));
    expect(screen.getByRole('radio', { name: 'Reading' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    fireEvent.changeText(screen.getByLabelText('Note'), 'Chapter 4');
    fireEvent.press(screen.getByRole('button', { name: 'Check in' }));

    await waitFor(() => expect(goBack).toHaveBeenCalled());
    expect(repositories.checkIns.add).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ activityId: 'reading', date: today(), note: 'Chapter 4' }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Checked in · Reading',
      expect.objectContaining({ description: 'Today now has 2 check-ins · Moderate' }),
    );
  });

  it('keeps the sheet and what was entered when saving fails', async () => {
    const repositories = repositoriesWith([]);
    repositories.checkIns.add.mockRejectedValueOnce(new Error('disk full'));
    renderWithApp(<CheckInSheet date={null} />, { scheme, repositories });

    fireEvent.press(await screen.findByRole('button', { name: 'Check in' }));
    expect(await screen.findByText(/Couldn't save your check-in/)).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeTruthy();
  });

  it('logs "Now" at the moment Check in is pressed, even after minutes with the sheet open', async () => {
    // Only the clock is faked: timers and animations run as usual.
    jest.useFakeTimers({ now: new Date(2026, 9, 5, 9, 0), doNotFake: REAL_TIMERS });
    try {
      const repositories = repositoriesWith([]);
      renderWithApp(<CheckInSheet date={null} />, { scheme, repositories });
      const checkIn = await screen.findByRole('button', { name: 'Check in' });

      // Four minutes writing a note, then Check in.
      jest.setSystemTime(new Date(2026, 9, 5, 9, 4));
      fireEvent.press(checkIn);

      await waitFor(() => expect(goBack).toHaveBeenCalled());
      expect(repositories.checkIns.add).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ date: '2026-10-05', minute: 9 * 60 + 4 }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('picks a time today, and needs no time for another day', async () => {
    const { unmount } = renderWithApp(<CheckInSheet date={null} />, {
      scheme,
      repositories: repositoriesWith([]),
    });
    fireEvent.press(await screen.findByRole('radio', { name: 'Pick time' }));
    expect(screen.getByRole('adjustable', { name: 'Time' })).toBeTruthy();
    unmount();

    renderWithApp(<CheckInSheet date={daysAgo(3)} />, { scheme, repositories: repositoriesWith([]) });
    expect(await screen.findByText(longDate(daysAgo(3)))).toBeTruthy();
    expect(screen.queryByText('When')).toBeNull();
    expect(screen.getByText('This day goes to 1 check-in · Light')).toBeTruthy();
  });

  it('starts on the activity it was opened with, and ignores one it does not know', async () => {
    const { unmount } = renderWithApp(<CheckInSheet date={daysAgo(2)} activityId="walk" />, {
      scheme,
      repositories: repositoriesWith([]),
    });
    expect((await screen.findByRole('radio', { name: 'Walk' })).props.accessibilityState).toMatchObject({
      selected: true,
    });
    unmount();

    renderWithApp(<CheckInSheet date={daysAgo(2)} activityId="not-an-activity" />, {
      scheme,
      repositories: repositoriesWith([]),
    });
    // Nothing logged yet: the first activity picked in setup.
    expect((await screen.findByRole('radio', { name: 'Workout' })).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});
