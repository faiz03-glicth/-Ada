import { fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { testUser } from '@test/fakes/fakeRepositories';
import { checkInDaysAgo, repositoriesWith } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { InsightsScreen } from '../ui/InsightsScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

beforeEach(() => {
  useAuthStore.getState().setUser(testUser());
});

describe.each(SCHEMES)('Insights in %s', (scheme) => {
  it('shows real progress instead of fake analytics until there are 7 active days', async () => {
    renderWithApp(<InsightsScreen />, {
      scheme,
      repositories: repositoriesWith([checkInDaysAgo(0), checkInDaysAgo(1), checkInDaysAgo(3)]),
    });
    expect(await screen.findByText('Not enough data yet')).toBeTruthy();
    expect(screen.getByTestId('insights-progress')).toHaveTextContent('3 of 7 days');
  });

  it('explains the check-ins in plain words, by week, month or year', async () => {
    const checkIns = Array.from({ length: 10 }, (_, days) => checkInDaysAgo(days, { activityId: 'reading' }));
    renderWithApp(<InsightsScreen />, { scheme, repositories: repositoriesWith(checkIns) });

    expect(await screen.findByText('Check-ins this month')).toBeTruthy();
    expect(screen.getByText(/is when you check in most\./)).toBeTruthy();
    expect(screen.getByLabelText('Reading: 10 check-ins, 100%')).toBeTruthy();
    expect(
      screen.getByText(/You were active on 100% of the 10 days since your first check-in\./),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Current streak, 10 days/)).toBeTruthy();

    fireEvent.press(screen.getByRole('radio', { name: 'Week' }));
    expect(screen.getByText('Check-ins this week')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Year' }));
    expect(screen.getByText('Check-ins this year')).toBeTruthy();
  });

  it('names no best day when nothing was logged in the last 90 days', async () => {
    const checkIns = Array.from({ length: 8 }, (_, days) => checkInDaysAgo(200 + days));
    renderWithApp(<InsightsScreen />, { scheme, repositories: repositoriesWith(checkIns) });

    expect(
      await screen.findByText('No check-ins in the last 90 days, so no day stands out yet.'),
    ).toBeTruthy();
    expect(screen.queryByText(/is when you check in most/)).toBeNull();
  });
});
