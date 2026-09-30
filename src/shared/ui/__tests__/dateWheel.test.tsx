import { fireEvent, screen } from '@testing-library/react-native';

import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { renderInScheme } from '@test/render';

import { DateWheel, type WheelDay } from '../DateWheel';

const days: WheelDay[] = [1, 2, 3].map((date) => ({
  key: `2026-08-0${date}`,
  weekday: 'S',
  date,
  level: 0 as const,
  today: false,
  label: `${date} August`,
}));
const wheel = () => screen.getByRole('adjustable', { name: 'Days in August' });

beforeEach(() => {
  jest.spyOn(haptics, 'selection').mockImplementation(() => undefined);
  jest.spyOn(sounds, 'play').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

it('without onConfirm, the centred date is already the choice: tapping it does nothing', () => {
  const onFocusChange = jest.fn();
  renderInScheme(
    <DateWheel
      days={days}
      focusedIndex={1}
      onFocusChange={onFocusChange}
      accessibilityLabel="Days in August"
    />,
  );
  expect(wheel().props.accessibilityHint).toBe('Swipe up or down to change the day');
  expect(wheel().props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);

  fireEvent.press(screen.getByTestId('wheel-2026-08-02'));
  expect(onFocusChange).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('wheel-2026-08-03'));
  expect(onFocusChange).toHaveBeenCalledWith(2);
});

it('with onConfirm, tapping or activating the centred date continues with it', () => {
  const onConfirm = jest.fn();
  renderInScheme(
    <DateWheel
      days={days}
      focusedIndex={1}
      onFocusChange={jest.fn()}
      onConfirm={onConfirm}
      accessibilityLabel="Days in August"
    />,
  );
  expect(wheel().props.accessibilityHint).toBe('Swipe up or down to change the day, double-tap to open it');
  fireEvent.press(screen.getByTestId('wheel-2026-08-02'));
  fireEvent(wheel(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  expect(onConfirm.mock.calls).toEqual([[1], [1]]);
});
