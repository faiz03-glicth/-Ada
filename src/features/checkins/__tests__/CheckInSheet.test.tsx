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
});
