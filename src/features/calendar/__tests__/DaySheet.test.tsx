import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { toast } from 'sonner-native';

import { useActivityPreferencesStore } from '@/features/activities/state/activityPreferencesStore';
import { useAuthStore } from '@/features/auth/state/authStore';
import { minuteOfDay } from '@/features/checkins/domain/CheckIn';
import { goBack, openCheckIn } from '@/shared/actions';
import { addMonths, monthLong, monthOf } from '@/shared/lib/date/calendar';
import { confirm } from '@/shared/lib/confirm';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { longDate } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { useToastsAreAtTop } from '@/shared/ui/toast';
import { testCheckIn } from '@test/fakes/fakeCheckIns';
import { testUser } from '@test/fakes/fakeRepositories';
import { repositoriesWith, today } from '@test/fixtures/checkIns';
import { renderWithApp } from '@test/providers';
import { SCHEMES } from '@test/render';

import { chosenDayMemory } from '../state/chosenDayMemory';
import { DaySheet } from '../ui/DaySheet';

jest.mock('@/shared/actions', () => require('@test/mocks/navigationActions'));
// The native confirmation: always answered "Delete".
jest.mock('@/shared/lib/confirm', () => ({ confirm: jest.fn(async () => true) }));

// Last month: every day of it has happened, whatever day the tests run on.
const lastMonth = addMonths(monthOf(today()), -1);
const dayOf = (date: number) =>
  `${lastMonth.year}-${String(lastMonth.month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}` as ISODate;

const wheel = () => screen.getByRole('adjustable', { name: `Days in ${monthLong(lastMonth.month)}` });
const swipe = (direction: 'increment' | 'decrement') =>
  fireEvent(wheel(), 'accessibilityAction', { nativeEvent: { actionName: direction } });
const checkInButton = () => screen.getByRole('button', { name: 'Check in' });

let haptic: jest.SpyInstance;
let tick: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  chosenDayMemory.clear();
  useAuthStore.getState().setUser(testUser());
  useActivityPreferencesStore.setState({ dailyGoal: 4 });
  haptic = jest.spyOn(haptics, 'selection').mockImplementation(() => undefined);
  tick = jest.spyOn(sounds, 'play').mockImplementation(() => undefined);
});

afterEach(() => {
  haptic.mockRestore();
  tick.mockRestore();
});

describe.each(SCHEMES)('Day sheet in %s', (scheme) => {
  it("opens on the linked day: the month as the title, that day's count, level and timeline", async () => {
    const repositories = repositoriesWith([
      testCheckIn({ id: 'a', date: dayOf(10), activityId: 'walk', note: 'Evening walk' }),
    ]);
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });

    expect(await screen.findByText('Evening walk')).toBeTruthy();
    expect(
      screen.getByRole('header', { name: `${monthLong(lastMonth.month)} ${lastMonth.year}` }),
    ).toBeTruthy();
    expect(screen.getByRole('header', { name: longDate(dayOf(10)) })).toBeTruthy();
    expect(wheel().props.accessibilityValue).toEqual({ text: `${longDate(dayOf(10))}, 1 check-in` });
    expect(screen.getByTestId('day-count')).toHaveTextContent('1');
    expect(screen.getByText('Light · 1 check-in')).toBeTruthy();
    expect(screen.getByText('Goal · 1 of 4')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Options for Walk at / })).toBeTruthy();
    // No second step and no second date control.
    expect(screen.queryByText(/^Open /)).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('Add check-in to this day')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(goBack).toHaveBeenCalled();
  });

  it('shows the daily goal for the chosen day, met or not', async () => {
    useActivityPreferencesStore.setState({ dailyGoal: 2 });
    const repositories = repositoriesWith([
      testCheckIn({ id: 'a', date: dayOf(10) }),
      testCheckIn({ id: 'b', date: dayOf(10) }),
      testCheckIn({ id: 'c', date: dayOf(11) }),
    ]);
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });

    expect(await screen.findByText('Goal met')).toBeTruthy();
    expect(screen.getByLabelText('2 check-ins, Moderate, daily goal met')).toBeTruthy();

    swipe('increment');
    expect(await screen.findByText('Goal · 1 of 2')).toBeTruthy();
    expect(screen.getByLabelText('1 check-in, Light, daily goal 1 of 2')).toBeTruthy();
    expect(screen.queryByText('Goal met')).toBeNull();
  });

  it('changes day with the wheel: everything below follows, felt and heard once, and remembered', async () => {
    const repositories = repositoriesWith([testCheckIn({ id: 'a', date: dayOf(10) })]);
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });
    await waitFor(() => expect(screen.getByTestId('day-count')).toHaveTextContent('1'));

    swipe('decrement');
    expect(screen.getByRole('header', { name: longDate(dayOf(9)) })).toBeTruthy();
    expect(screen.getByTestId('day-count')).toHaveTextContent('0');
    expect(screen.getByText('No check-ins on this day')).toBeTruthy();
    expect(haptic).toHaveBeenCalledTimes(1);
    expect(tick).toHaveBeenCalledWith('dateTick');
    expect(chosenDayMemory.get(lastMonth)).toBe(dayOf(9));
  });

  it('checks in for the chosen day and stays open; swipe, then Check in logs the next day', async () => {
    const repositories = repositoriesWith([]);
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });

    fireEvent.press(await screen.findByRole('radio', { name: 'Reading' }));
    fireEvent.press(checkInButton());
    await waitFor(() => expect(screen.getByTestId('day-count')).toHaveTextContent('1'));
    expect(repositories.checkIns.add).toHaveBeenLastCalledWith('user-1', {
      date: dayOf(10),
      minute: 12 * 60,
      activityId: 'reading',
      note: '',
    });
    expect(toast.success).toHaveBeenCalledWith('Checked in · Reading', expect.anything());
    expect(goBack).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Reading' }).props.accessibilityState).toMatchObject({
      selected: true,
    });

    swipe('increment');
    fireEvent.press(checkInButton());
    await waitFor(() => expect(screen.getByTestId('day-count')).toHaveTextContent('1'));
    expect(repositories.checkIns.add).toHaveBeenLastCalledWith(
      'user-1',
      expect.objectContaining({ date: dayOf(11), activityId: 'reading' }),
    );
  });

  it('checks in today at the current minute, and offers a time with the note', async () => {
    const repositories = repositoriesWith([]);
    renderWithApp(<DaySheet date={today()} />, { scheme, repositories });

    expect(await screen.findByText('Today')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add a note or time' })).toBeTruthy();
    fireEvent.press(checkInButton());
    await waitFor(() => expect(repositories.checkIns.add).toHaveBeenCalled());
    const [, saved] = repositories.checkIns.add.mock.calls[0]!;
    expect(Math.abs(saved.minute - minuteOfDay(new Date()))).toBeLessThanOrEqual(1);
  });

  it('keeps the activity and says what to do when saving fails, until the day changes', async () => {
    const repositories = repositoriesWith([]);
    repositories.checkIns.add.mockRejectedValueOnce(new Error('disk full'));
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });

    fireEvent.press(await screen.findByRole('radio', { name: 'Walk' }));
    fireEvent.press(checkInButton());
    expect(await screen.findByText(/Couldn't save your check-in/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Walk' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(toast.success).not.toHaveBeenCalled();

    swipe('decrement');
    await waitFor(() => expect(screen.queryByText(/Couldn't save your check-in/)).toBeNull());
  });

  it('opens New check-in for a note, with the day and the picked activity', async () => {
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories: repositoriesWith([]) });

    fireEvent.press(await screen.findByRole('radio', { name: 'Water' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    expect(openCheckIn).toHaveBeenCalledWith({ date: dayOf(10), activityId: 'water' });
  });

  it('saves to the day that was centred at the press, even if the wheel moves before the save lands', async () => {
    const repositories = repositoriesWith([]);
    const store = repositories.checkIns.add.getMockImplementation()!;
    let land: () => void = () => undefined;
    repositories.checkIns.add.mockImplementationOnce(
      (who, input) =>
        new Promise((resolve) => {
          land = () => resolve(store(who, input));
        }),
    );
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });

    fireEvent.press(await screen.findByRole('button', { name: 'Check in' }));
    swipe('increment');
    act(() => land());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(repositories.checkIns.add).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ date: dayOf(10) }),
    );
    expect(screen.getByRole('header', { name: longDate(dayOf(11)) })).toBeTruthy();
    expect(screen.getByTestId('day-count')).toHaveTextContent('0');
  });

  it('saves once, however fast Check in is pressed', async () => {
    const repositories = repositoriesWith([]);
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });

    const button = await screen.findByRole('button', { name: 'Check in' });
    fireEvent.press(button);
    fireEvent.press(button);
    await waitFor(() => expect(screen.getByTestId('day-count')).toHaveTextContent('1'));
    expect(repositories.checkIns.add).toHaveBeenCalledTimes(1);
  });

  it('keeps the wheel and the day below it in step, however fast the days change', async () => {
    renderWithApp(<DaySheet date={dayOf(20)} />, { scheme, repositories: repositoriesWith([]) });
    await screen.findByRole('header', { name: longDate(dayOf(20)) });

    for (let i = 0; i < 7; i += 1) swipe('decrement');
    expect(wheel().props.accessibilityValue).toEqual({ text: `${longDate(dayOf(13))}, 0 check-ins` });
    expect(screen.getByRole('header', { name: longDate(dayOf(13)) })).toBeTruthy();
  });

  it("opens today for a day that hasn't happened or a broken link", async () => {
    const { unmount } = renderWithApp(<DaySheet date={'2099-01-01' as ISODate} />, {
      scheme,
      repositories: repositoriesWith([]),
    });
    expect(await screen.findByRole('header', { name: longDate(today()) })).toBeTruthy();
    unmount();

    renderWithApp(<DaySheet date={null} />, { scheme, repositories: repositoriesWith([]) });
    expect(await screen.findByRole('header', { name: longDate(today()) })).toBeTruthy();
  });

  it('deletes a check-in from its timeline after a confirm, and Undo brings it back', async () => {
    const repositories = repositoriesWith([testCheckIn({ id: 'a', date: dayOf(10), activityId: 'walk' })]);
    renderWithApp(<DaySheet date={dayOf(10)} />, { scheme, repositories });

    fireEvent.press(await screen.findByRole('button', { name: /^Options for Walk at / }));
    await waitFor(() => expect(screen.getByTestId('day-count')).toHaveTextContent('0'));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete this check-in?', destructive: true }),
    );
    expect(repositories.checkIns.remove).toHaveBeenCalledWith('a');
    expect(screen.getByText('No check-ins on this day')).toBeTruthy();

    const [title, options] = jest.mocked(toast.success).mock.calls.at(-1)!;
    expect(title).toBe('Check-in deleted');
    act(() => (options as { action: { onClick: () => void } }).action.onClick());
    await waitFor(() => expect(screen.getByTestId('day-count')).toHaveTextContent('1'));
    expect(screen.getByRole('button', { name: /^Options for Walk at / })).toBeTruthy();
  });

  it('asks for toasts at the top, clear of Check in, and only while it is open', async () => {
    function Placement() {
      return <Text testID="placement">{useToastsAreAtTop() ? 'top' : 'bottom'}</Text>;
    }
    const { rerender } = renderWithApp(
      <>
        <Placement />
        <DaySheet date={dayOf(10)} />
      </>,
      { scheme, repositories: repositoriesWith([]) },
    );
    await screen.findByRole('button', { name: 'Check in' });
    expect(screen.getByTestId('placement')).toHaveTextContent('top');

    rerender(<Placement />);
    expect(screen.getByTestId('placement')).toHaveTextContent('bottom');
  });
});
