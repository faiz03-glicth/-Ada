import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { openCheckIn, openDay } from '@/shared/actions';
import { testUser } from '@test/fakes/fakeRepositories';
import { checkInDaysAgo, daysAgo, repositoriesWith } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { HistoryScreen } from '../ui/HistoryScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().setUser(testUser());
});

const seed = () =>
  repositoriesWith([
    checkInDaysAgo(0, { activityId: 'reading', note: 'Chapter 4' }),
    checkInDaysAgo(0, { activityId: 'workout' }),
    checkInDaysAgo(1, { activityId: 'walk', note: 'Evening walk' }),
  ]);

describe.each(SCHEMES)('History in %s', (scheme) => {
  it('groups check-ins by day and opens a day', async () => {
    renderWithApp(<HistoryScreen />, { scheme, repositories: seed() });
    expect(await screen.findByRole('button', { name: 'Today, 2 check-ins' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yesterday, 1 check-in' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Yesterday, 1 check-in' }));
    expect(openDay).toHaveBeenCalledWith(daysAgo(1));
  });

  it('searches notes and filters by activity', async () => {
    renderWithApp(<HistoryScreen />, { scheme, repositories: seed() });
    await screen.findByText('Chapter 4');

    fireEvent.changeText(screen.getByLabelText('Search activities and notes'), 'evening');
    await waitFor(() => expect(screen.queryByText('Chapter 4')).toBeNull());
    expect(screen.getByText('Evening walk')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Search activities and notes'), '');
    fireEvent.press(screen.getByRole('radio', { name: 'Workout' }));
    await waitFor(() => expect(screen.queryByText('Evening walk')).toBeNull());
    expect(screen.getByRole('button', { name: 'Today, 2 check-ins' })).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Search activities and notes'), 'nothing like this');
    expect(await screen.findByText('No check-ins match “nothing like this”.')).toBeTruthy();
  });

  it('explains itself when there is nothing yet', async () => {
    renderWithApp(<HistoryScreen />, { scheme, repositories: repositoriesWith([]) });
    expect(await screen.findByText('No check-ins yet')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add a check-in' }));
    expect(openCheckIn).toHaveBeenCalled();
  });
});
