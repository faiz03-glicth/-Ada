import { act, renderHook } from '@testing-library/react-native';

import { reduceMotionCaption, themeCaption } from '@/features/settings/config/appearance';

import { useNavigationMotion } from '../hooks/useNavigationMotion';
import { resolveReduceMotion, useReduceMotion } from '../hooks/useReduceMotion';
import { useSystemMotionStore } from '../state/systemMotionStore';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';

beforeEach(() => {
  act(() => {
    useThemePreferencesStore.getState().setReduceMotion('system');
    useSystemMotionStore.setState({ reduceMotion: false });
  });
});

describe('resolveReduceMotion', () => {
  it.each([
    ['system', false, false],
    ['system', true, true],
    ['on', false, true],
    ['off', true, false],
  ] as const)('%s with the phone at %s → %s', (preference, system, expected) => {
    expect(resolveReduceMotion(preference, system)).toBe(expected);
  });
});

describe('useReduceMotion', () => {
  it('follows the phone live by default, and the in-app choice overrides it', () => {
    const { result } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);

    act(() => useSystemMotionStore.getState().setReduceMotion(true));
    expect(result.current).toBe(true);

    act(() => useThemePreferencesStore.getState().setReduceMotion('off'));
    expect(result.current).toBe(false);

    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    act(() => useSystemMotionStore.getState().setReduceMotion(false));
    expect(result.current).toBe(true);
  });

  it('persists the choice with the other appearance preferences', () => {
    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    expect(
      useThemePreferencesStore.persist.getOptions().partialize?.(useThemePreferencesStore.getState()),
    ).toMatchObject({
      reduceMotion: 'on',
    });
  });
});

describe('useNavigationMotion', () => {
  it('slides normally and only fades with Reduce Motion', () => {
    const { result } = renderHook(() => useNavigationMotion());
    expect(result.current).toBe(motion.navigation);
    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    expect(result.current).toEqual({ push: 'fade', groupSwitch: 'fade', tabs: 'none' });
  });
});

describe('appearance captions', () => {
  it('explain what System means right now', () => {
    expect(themeCaption('system', 'dark')).toBe('Matches your phone (dark right now).');
    expect(themeCaption('light', 'dark')).toBe('Always light.');
    expect(reduceMotionCaption('system', true)).toBe('Matches your phone (reduced right now).');
    expect(reduceMotionCaption('off', true)).toBe('Full motion, even if your phone reduces it.');
  });
});
