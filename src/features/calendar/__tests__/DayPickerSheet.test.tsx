import { fireEvent, screen, within } from '@testing-library/react-native';

import { useAuthStore } from '@/features/auth/state/authStore';
import { indexCheckIns } from '@/features/checkins/domain/checkInIndex';
import { goBack, openDayFromPicker } from '@/shared/actions';
import {
  addMonths,
  daysInMonth,
  firstOfMonth,
  lastOfMonth,
  monthLong,
  monthOf,
} from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { longDate } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { testCheckIn } from '@test/fakes/fakeCheckIns';
import { testUser } from '@test/fakes/fakeRepositories';
import { checkInDaysAgo, repositoriesWith, today } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { dayPickerMemory } from '../state/dayPickerMemory';
import { DayPickerSheet } from '../ui/DayPickerSheet';
import { openingIndex } from '../ui/useDayPickerViewModel';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));

// Last month: every day of it has happened, whatever day the tests run on.
const lastMonth = addMonths(monthOf(today()), -1);
const options = { year: lastMonth.year, month: lastMonth.month + 1 };
const dayOfLastMonth = (date: number) =>
  `${lastMonth.year}-${String(lastMonth.month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}` as ISODate;

const wheel = () => screen.getByRole('adjustable', { name: `Days in ${monthLong(lastMonth.month)}` });
const swipe = (direction: 'increment' | 'decrement') =>
  fireEvent(wheel(), 'accessibilityAction', { nativeEvent: { actionName: direction } });

let haptic: jest.SpyInstance;
let tick: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  dayPickerMemory.clear();
  useAuthStore.getState().setUser(testUser());
  haptic = jest.spyOn(haptics, 'selection').mockImplementation(() => undefined);
  tick = jest.spyOn(sounds, 'play').mockImplementation(() => undefined);
});

afterEach(() => {
  haptic.mockRestore();
  tick.mockRestore();
});

describe.each(SCHEMES)('Day picker in %s', (scheme) => {
  it('lays out every day of the month: weekday above the block, the date below it', async () => {
    const repositories = repositoriesWith([testCheckIn({ id: 'a', date: dayOfLastMonth(10) })]);
    renderWithApp(<DayPickerSheet options={options} />, { scheme, repositories });

    expect(
      await screen.findByRole('header', { name: `${monthLong(lastMonth.month)} ${lastMonth.year}` }),
    ).toBeTruthy();
    const count = daysInMonth(lastMonth);
    expect(screen.getByTestId(`wheel-${firstOfMonth(lastMonth)}`)).toBeTruthy();
    expect(screen.getByTestId(`wheel-${lastOfMonth(lastMonth)}`)).toBeTruthy();
    expect(screen.queryByTestId(`wheel-${dayOfLastMonth(count + 1)}`)).toBeNull();

    // Weekday first, then the block, then the number (the order they're drawn, top to bottom).
    const slot = within(screen.getByTestId(`wheel-${dayOfLastMonth(10)}`));
    const texts = slot.getAllByText(/.+/).map((node) => node.props.children);
    expect(texts[texts.length - 1]).toBe(10);
    expect(typeof texts[0]).toBe('string');

    // It opens on the month's most recent day with a check-in.
    expect(wheel().props.accessibilityValue).toEqual({ text: `${longDate(dayOfLastMonth(10))}, 1 check-in` });
    expect(screen.getByText(longDate(dayOfLastMonth(10)))).toBeTruthy();
  });

  it('moves one day per step, with exactly one haptic and one wooden tick each time', async () => {
    renderWithApp(<DayPickerSheet options={options} />, { scheme, repositories: repositoriesWith([]) });
    await screen.findByText(longDate(lastOfMonth(lastMonth)));
    expect(haptic).not.toHaveBeenCalled();
    expect(tick).not.toHaveBeenCalled();

    swipe('decrement');
    expect(screen.getByText(longDate(dayOfLastMonth(daysInMonth(lastMonth) - 1)))).toBeTruthy();
    expect(haptic).toHaveBeenCalledTimes(1);
    expect(tick).toHaveBeenCalledWith('dateTick');

    swipe('increment');
    expect(screen.getByText(longDate(lastOfMonth(lastMonth)))).toBeTruthy();
    expect(haptic).toHaveBeenCalledTimes(2);

    // Past the last day there's nowhere to go: nothing changes, nothing is felt.
    swipe('increment');
    expect(haptic).toHaveBeenCalledTimes(2);
  });

  it('brings a tapped date to the centre, and opens the centred one', async () => {
    renderWithApp(<DayPickerSheet options={options} />, { scheme, repositories: repositoriesWith([]) });
    await screen.findByText(longDate(lastOfMonth(lastMonth)));

    fireEvent.press(screen.getByTestId(`wheel-${dayOfLastMonth(3)}`));
    expect(screen.getByText(longDate(dayOfLastMonth(3)))).toBeTruthy();
    expect(openDayFromPicker).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(`wheel-${dayOfLastMonth(3)}`));
    expect(openDayFromPicker).toHaveBeenCalledWith(dayOfLastMonth(3));

    fireEvent.press(screen.getByTestId('day-picker-open'));
    expect(openDayFromPicker).toHaveBeenLastCalledWith(dayOfLastMonth(3));
    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(goBack).toHaveBeenCalled();
  });

  it("opens this month on today, and never offers days that haven't happened", async () => {
    const now = monthOf(today());
    renderWithApp(<DayPickerSheet options={{ year: now.year, month: now.month + 1 }} />, {
      scheme,
      repositories: repositoriesWith([checkInDaysAgo(0)]),
    });
    expect(await screen.findByText(longDate(today()))).toBeTruthy();
    expect(screen.getByTestId(`wheel-${today()}`)).toBeTruthy();
    expect(screen.queryByTestId(`wheel-${lastOfMonth(now)}`) === null || lastOfMonth(now) === today()).toBe(
      true,
    );
  });
});

describe('where the wheel opens', () => {
  const days = ['2026-08-01', '2026-08-02', '2026-08-03'] as ISODate[];
  const index = indexCheckIns([testCheckIn({ id: 'x', date: '2026-08-02' as ISODate })]);

  it('prefers the remembered day, then today, then the latest check-in, then the last day', () => {
    expect(openingIndex(days, '2026-09-26' as ISODate, index, '2026-08-01' as ISODate)).toBe(0);
    expect(openingIndex(days, '2026-08-03' as ISODate, index, undefined)).toBe(2);
    expect(openingIndex(days, '2026-09-26' as ISODate, index, undefined)).toBe(1);
    expect(openingIndex(days, '2026-09-26' as ISODate, indexCheckIns([]), undefined)).toBe(2);
  });
});
