import { fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { openCheckIn, openDay, openDayPicker, openHeatmap } from '@/shared/actions';
import { monthLong } from '@/shared/lib/date/calendar';
import { testUser } from '@test/fakes/fakeRepositories';
import { checkInDaysAgo, repositoriesWith, today } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { HomeScreen } from '../ui/HomeScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().setUser(testUser());
});

describe.each(SCHEMES)('Home in %s', (scheme) => {
  it('shows the heatmap, the stats and today, all from the same check-ins', async () => {
    const repositories = repositoriesWith([
      checkInDaysAgo(0, { activityId: 'reading', note: 'Chapter 4' }),
      checkInDaysAgo(0),
      checkInDaysAgo(1),
      checkInDaysAgo(2),
    ]);
    renderWithApp(<HomeScreen />, { scheme, repositories });

    expect(await screen.findByText('Today · 2 check-ins')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Your activity' })).toBeTruthy();
    expect(screen.getByLabelText('Day streak, 3')).toBeTruthy();
    // Today's list, newest first, with the note.
    expect(screen.getByText('Reading')).toBeTruthy();
    expect(screen.getByText(/Chapter 4/)).toBeTruthy();
  });

  it('opens a month (not a tiny day) from the heatmap, today from its line, the year from its title', async () => {
    renderWithApp(<HomeScreen />, { scheme, repositories: repositoriesWith([checkInDaysAgo(0)]) });
    const now = new Date();
    const month = await screen.findByRole('button', {
      name: `${monthLong(now.getMonth())} ${now.getFullYear()}, 1 check-in`,
    });
    fireEvent.press(month);
    expect(openDayPicker).toHaveBeenCalledWith({ year: now.getFullYear(), month: now.getMonth() + 1 });
    // The days themselves are no longer buttons.
    expect(screen.queryAllByRole('button', { name: /: \d+ check-in/ })).toEqual([]);

    fireEvent.press(screen.getByRole('button', { name: 'Today, 1 check-in' }));
    expect(openDay).toHaveBeenCalledWith(today());

    fireEvent.press(screen.getByHintText('Opens the full heatmap'));
    expect(openHeatmap).toHaveBeenCalledWith(expect.objectContaining({ view: 'year' }));
  });

  it('steps back through months, and switches the trend range', async () => {
    renderWithApp(<HomeScreen />, { scheme, repositories: repositoriesWith([checkInDaysAgo(0)]) });
    await screen.findByText('Today · 1 check-in');
    const next = screen.getByRole('button', { name: 'Next months' });
    expect(next.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByRole('button', { name: 'Previous months' }));
    expect(screen.getByRole('button', { name: 'Next months' }).props.accessibilityState).toMatchObject({
      disabled: false,
    });

    expect(screen.getByText('Check-ins per week')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'D' }));
    expect(screen.getByText('Check-ins per day')).toBeTruthy();
  });

  it('keeps the layout when empty, with one clear next step', async () => {
    renderWithApp(<HomeScreen />, { scheme, repositories: repositoriesWith([]) });
    expect(await screen.findByText('Your heatmap starts today')).toBeTruthy();
    expect(screen.getByText('Your trend appears after a week')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Log your first check-in' }));
    expect(openCheckIn).toHaveBeenCalled();
  });
});
