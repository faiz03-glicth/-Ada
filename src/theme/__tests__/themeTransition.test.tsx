import { act, render, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { UnistylesRuntime } from 'react-native-unistyles';

import { useStateTransition } from '../hooks/useStateTransition';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { ThemeRuntimeBridge } from '../sync/ThemeRuntimeBridge';
import { motion } from '../tokens/motion';

jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: {
    pushStackEntry: jest.fn((props: unknown) => props),
    replaceStackEntry: jest.fn((_entry: unknown, props: unknown) => props),
    popStackEntry: jest.fn(),
  },
}));

const prefs = () => useThemePreferencesStore.getState();

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  act(() => useThemePreferencesStore.setState({ preference: 'light', reduceMotion: 'off' }));
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('theme transitions', () => {
  it('apply the theme at launch without any transition', () => {
    render(<ThemeRuntimeBridge />);
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('light');
    expect(SystemBars.pushStackEntry).toHaveBeenCalledWith({ style: 'dark' });
  });

  it('fade through a change: the new theme is swapped in only once the veil covers the app', () => {
    render(<ThemeRuntimeBridge />);
    jest.clearAllMocks();

    act(() => prefs().setPreference('dark'));
    // The choice is stored at once; the visual swap waits for the veil (never a half-themed frame).
    expect(prefs().preference).toBe('dark');
    expect(UnistylesRuntime.setTheme).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(motion.themeFade.in + 50));
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('dark');
    expect(SystemBars.replaceStackEntry).toHaveBeenCalledWith(expect.anything(), { style: 'light' });
    // The theme never touches the motion setting.
    expect(prefs().reduceMotion).toBe('off');
  });

  it('switch instantly with Reduce Motion', () => {
    act(() => prefs().setReduceMotion('on'));
    render(<ThemeRuntimeBridge />);
    jest.clearAllMocks();

    act(() => prefs().setPreference('dark'));
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('dark');
    expect(prefs().reduceMotion).toBe('on');
  });

  it('let the latest choice win: switching back before the swap never shows the other theme', () => {
    render(<ThemeRuntimeBridge />);
    jest.clearAllMocks();

    act(() => prefs().setPreference('dark'));
    act(() => jest.advanceTimersByTime(40));
    act(() => prefs().setPreference('light'));
    act(() => jest.advanceTimersByTime(600));
    expect(UnistylesRuntime.setTheme).not.toHaveBeenCalledWith('dark');
  });
});

describe('useStateTransition', () => {
  it('transitions the listed properties at the chosen speed, and instantly with Reduce Motion', () => {
    const { result, rerender } = renderHook(() => useStateTransition(['borderColor'], 'normal'));
    expect(result.current).toMatchObject({
      transitionProperty: ['borderColor'],
      transitionDuration: motion.speed.normal,
    });

    act(() => prefs().setReduceMotion('on'));
    rerender({});
    expect(result.current.transitionDuration).toBe(0);
  });
});
