import { fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { goBack, openCheckIn, showDay } from '@/shared/actions';
import { longDate } from '@/shared/lib/format/dates';
import { testUser } from '@test/fakes/fakeRepositories';
import { checkInDaysAgo, daysAgo, repositoriesWith } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { DayDetailsSheet } from '../ui/DayDetailsSheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().setUser(testUser());
});

describe.each(SCHEMES)('Day details in %s', (scheme) => {
  it("shows the day's count, intensity and timeline", async () => {
    const day = daysAgo(2);
    const repositories = repositoriesWith([
      checkInDaysAgo(2, { activityId: 'walk', note: 'Evening walk' }),
      checkInDaysAgo(2, { activityId: 'water' }),
      checkInDaysAgo(1),
    ]);
    renderWithApp(<DayDetailsSheet date={day} />, { scheme, repositories });

    expect(await screen.findByText('Walk')).toBeTruthy();
    expect(screen.getByRole('header', { name: longDate(day) })).toBeTruthy();
    expect(screen.getByTestId('day-count')).toHaveTextContent('2');
    expect(screen.getByText('Moderate · 2–3 check-ins')).toBeTruthy();
    expect(screen.getByText('Evening walk')).toBeTruthy();
    expect(screen.getByText('No note')).toBeTruthy();
  });

  it('steps to another day in place and adds a check-in to this day', async () => {
    const day = daysAgo(2);
    renderWithApp(<DayDetailsSheet date={day} />, {
      scheme,
      repositories: repositoriesWith([checkInDaysAgo(1)]),
    });

    expect(await screen.findByText('No check-ins on this day')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`strip-${daysAgo(1)}`));
    expect(showDay).toHaveBeenCalledWith(daysAgo(1));
    fireEvent.press(screen.getByRole('button', { name: 'Add check-in to this day' }));
    expect(openCheckIn).toHaveBeenCalledWith({ date: day });
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(goBack).toHaveBeenCalled();
  });
});
