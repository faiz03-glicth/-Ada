import { fireEvent, screen } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { indexCheckIns } from '@/features/checkins/domain/checkInIndex';
import { openDay } from '@/shared/actions';
import { monthLong, monthShort } from '@/shared/lib/date/calendar';
import { testUser } from '@test/fakes/fakeRepositories';
import { checkInDaysAgo, repositoriesWith, today } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { openingDay } from '../domain/openingDay';
import { CalendarScreen } from '../ui/CalendarScreen';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().setUser(testUser());
});

const year = new Date().getFullYear();

describe.each(SCHEMES)('Calendar in %s', (scheme) => {
  it('shows the year in quarters and steps between years, never past this one', async () => {
    renderWithApp(<CalendarScreen options={{ view: 'year' }} />, {
      scheme,
      repositories: repositoriesWith([checkInDaysAgo(0), checkInDaysAgo(0)]),
    });
    expect(await screen.findByLabelText('Check-ins, 2')).toBeTruthy();
    expect(screen.getByTestId('calendar-title')).toHaveTextContent(String(year));
    expect(screen.getByRole('button', { name: 'Next year' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    // A month of the year opens its days on the wheel; months still to come don't answer.
    fireEvent.press(screen.getByRole('button', { name: /^January \d+, / }));
    expect(openDay).toHaveBeenCalledWith(
      openingDay({ year, month: 0 }, today(), indexCheckIns([]), undefined),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByTestId('calendar-title')).toHaveTextContent(String(year - 1));
    expect(screen.getByLabelText('Check-ins, 0')).toBeTruthy();
  });

  it('shows a month as day tiles that open the day', async () => {
    renderWithApp(<CalendarScreen options={{ view: 'year' }} />, {
      scheme,
      repositories: repositoriesWith([checkInDaysAgo(0)]),
    });
    fireEvent.press(await screen.findByRole('radio', { name: 'Month' }));
    expect(screen.getByTestId('calendar-title')).toHaveTextContent(
      `${monthLong(new Date().getMonth())} ${year}`,
    );
    fireEvent.press(screen.getByTestId(`tile-${today()}`));
    expect(openDay).toHaveBeenCalledWith(today());
    expect(screen.getByText('Busiest day')).toBeTruthy();
    // One check-in is "1 check-in", not "1 check-ins".
    const now = new Date();
    expect(screen.getByText(`${monthShort(now.getMonth())} ${now.getDate()} · 1 check-in`)).toBeTruthy();
  });
});
