import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';
import { toast } from 'sonner-native';

import { TAB_ITEMS, type TabId } from '@/shared/config/tabs';
import { motion } from '@/theme';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';
import type { ColorScheme, VisualStyle } from '@/theme/types';
import { setTestTheme } from '@test/mocks/unistyles';
import { renderInScheme, SCHEMES, styleOf } from '@test/render';

import { PhasePlaceholder } from '../PhasePlaceholder';
import { Screen } from '../Screen';
import { TabBar } from '../TabBar';
import { Text } from '../Text';
import { dismissAllToasts, showInfo, showSuccess } from '../toast';

describe.each(SCHEMES)('layout components in %s', (scheme) => {
  it('Screen renders its content, scrolling or not', () => {
    const { rerender } = renderInScheme(
      <Screen>
        <Text>Static</Text>
      </Screen>,
      scheme,
    );
    expect(screen.getByText('Static')).toBeTruthy();
    rerender(
      <Screen scroll withTabBar>
        <Text>Scrolling</Text>
      </Screen>,
    );
    expect(screen.getByText('Scrolling')).toBeTruthy();
  });

  it('TabBar marks the active tab and routes presses', () => {
    const onTabPress = jest.fn();
    const onFabPress = jest.fn();
    renderInScheme(
      <TabBar items={TAB_ITEMS} active="profile" onTabPress={onTabPress} onFabPress={onFabPress} />,
      scheme,
    );
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Profile' }).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByRole('tab', { name: 'Insights' }));
    expect(onTabPress).toHaveBeenCalledWith('insights');
    fireEvent.press(screen.getByRole('button', { name: 'New check-in' }));
    expect(onFabPress).toHaveBeenCalled();
  });

  it('TabBar shows ONE liquid once tabs are measured, even after rapid taps', () => {
    const layout = (x: number) => ({ nativeEvent: { layout: { x, y: 6, width: 70, height: 52 } } });
    const onTabPress = jest.fn();
    const { theme } = renderInScheme(
      <TabBar items={TAB_ITEMS} active="home" onTabPress={onTabPress} onFabPress={jest.fn()} />,
      scheme,
    );
    const hidden = { includeHiddenElements: true };
    // Decorative and hidden from screen readers; absent until the tabs have been laid out.
    expect(screen.queryByTestId('tab-indicator', hidden)).toBeNull();

    TAB_ITEMS.forEach((item, index) =>
      fireEvent(screen.getByTestId(`tab-${item.id}`), 'layout', layout(6 + index * 70)),
    );
    // Before the content is measured the liquid fills the tab row's height.
    expect(styleOf(screen.getByTestId('tab-indicator', hidden))).toMatchObject({ top: 6, height: 52 });
    expect(styleOf(screen.getByTestId('liquid-head', hidden))).toMatchObject({
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.accentSoft,
    });

    for (const name of ['Insights', 'History', 'Profile', 'Home'])
      fireEvent.press(screen.getByRole('tab', { name }));
    // Navigation fired for every tap, in order, while exactly one liquid exists.
    expect(onTabPress.mock.calls.map(([tab]) => tab)).toEqual(['insights', 'history', 'profile', 'home']);
    expect(screen.getAllByTestId('tab-indicator', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('liquid-head', hidden)).toHaveLength(1);
  });

  it('magnifies the icon under the liquid, never the others, and not at all with Reduce Motion', () => {
    const layout = (x: number) => ({ nativeEvent: { layout: { x, y: 6, width: 70, height: 52 } } });
    const scaleOf = (id: string) => {
      const transform = getAnimatedStyle(screen.getByTestId(`tab-${id}-icon`)).transform;
      const entry = Array.isArray(transform) ? transform.find((t) => 'scale' in t) : undefined;
      return entry && 'scale' in entry ? entry.scale : undefined;
    };
    const renderBar = () => {
      const view = renderInScheme(
        <TabBar items={TAB_ITEMS} active="home" onTabPress={jest.fn()} onFabPress={jest.fn()} />,
        scheme,
      );
      fireEvent(screen.getByTestId('tab-home'), 'layout', layout(6));
      fireEvent(screen.getByTestId('tab-insights'), 'layout', layout(76));
      // Animated styles are recomputed on the next frame.
      act(() => jest.advanceTimersByTime(50));
      return view;
    };

    jest.useFakeTimers();
    const { unmount } = renderBar();
    expect(scaleOf('home')).toBeCloseTo(1 + motion.liquid.magnify.rest);
    expect(scaleOf('insights')).toBe(1);
    unmount();

    act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
    renderBar();
    expect(scaleOf('home')).toBe(1);
    act(() => useThemePreferencesStore.getState().setReduceMotion('system'));
    jest.useRealTimers();
  });

  it('dragging the liquid along the bar selects the tab it is released on', async () => {
    const onTabPress = jest.fn();
    renderInScheme(
      <TabBar items={TAB_ITEMS} active="home" onTabPress={onTabPress} onFabPress={jest.fn()} />,
      scheme,
    );
    const layout = (x: number) => ({ nativeEvent: { layout: { x, y: 6, width: 70, height: 52 } } });
    fireEvent(screen.getByTestId('tab-home'), 'layout', layout(10));
    fireEvent(screen.getByTestId('tab-insights'), 'layout', layout(80));
    fireEvent(screen.getByTestId('tab-history'), 'layout', layout(234));
    fireEvent(screen.getByTestId('tab-profile'), 'layout', layout(304));

    // The liquid follows the finger's position on the bar; History's centre is 269.
    act(() => {
      fireGestureHandler(getByGestureTestId('tab-bar-drag'), [
        { state: State.BEGAN, x: 45 },
        { state: State.ACTIVE, x: 85 },
        { x: 262 },
        { state: State.END, x: 262 },
      ]);
    });
    await waitFor(() => expect(onTabPress).toHaveBeenCalledWith('history'));
    expect(onTabPress).toHaveBeenCalledTimes(1);
  });

  it('PhasePlaceholder names the phase and has a working back button', () => {
    const onBack = jest.fn();
    renderInScheme(<PhasePlaceholder title="Heatmap" phase={2} onBack={onBack} />, scheme);
    expect(screen.getByRole('header', { name: 'Coming in Phase 2' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});

const LOOKS: readonly [ColorScheme, VisualStyle][] = [
  ['light', 'classic'],
  ['dark', 'classic'],
  ['light', 'glass'],
  ['dark', 'glass'],
];

describe.each(LOOKS)('the liquid in %s %s', (scheme, style) => {
  // Real bar order: Home, Insights, the + button's slot, History, Profile. Every tab is 70pt wide.
  const TAB_X: Record<TabId, number> = { home: 10, insights: 80, history: 234, profile: 304 };
  const hidden = { includeHiddenElements: true };
  // Where each end's right cap rests on a tab: the liquid is 70pt wide and 52pt tall (the tab row) here.
  const restX = (tab: TabId) => TAB_X[tab] + 35 + (70 - 52) / 2 - 52 / 2;
  const capX = (testID: string) => {
    const transform = getAnimatedStyle(screen.getByTestId(testID, hidden)).transform;
    const entry = Array.isArray(transform) ? transform.find((t) => 'translateX' in t) : undefined;
    return entry && 'translateX' in entry ? entry.translateX : undefined;
  };
  const measure = () =>
    TAB_ITEMS.forEach((item) =>
      fireEvent(screen.getByTestId(`tab-${item.id}`), 'layout', {
        nativeEvent: { layout: { x: TAB_X[item.id], y: 6, width: 70, height: 52 } },
      }),
    );
  const settle = (ms = 2000) => act(() => jest.advanceTimersByTime(ms));
  const expectOnePillOn = (tab: TabId) => {
    expect(screen.getAllByTestId('tab-indicator', hidden)).toHaveLength(1);
    expect(getAnimatedStyle(screen.getByTestId('tab-indicator', hidden)).opacity).toBe(1);
    // Both ends gathered on the tab: one pill, nothing left behind.
    expect(capX('liquid-head')).toBeCloseTo(restX(tab));
    expect(capX('liquid-tail')).toBeCloseTo(restX(tab));
  };

  function NavigatingBar({ initial = 'home' }: { initial?: TabId }) {
    const [active, setActive] = useState<TabId>(initial);
    return <TabBar items={TAB_ITEMS} active={active} onTabPress={setActive} onFabPress={jest.fn()} />;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    setTestTheme(scheme, style);
  });
  afterEach(() => {
    act(() => useThemePreferencesStore.getState().setReduceMotion('system'));
    jest.useRealTimers();
  });

  it("is never drawn at the bar's left edge before it is placed, even if the tab changed first", () => {
    const { rerender } = render(
      <TabBar items={TAB_ITEMS} active="home" onTabPress={jest.fn()} onFabPress={jest.fn()} />,
    );
    // Navigated before the bar was laid out (e.g. opened on Profile).
    rerender(<TabBar items={TAB_ITEMS} active="profile" onTabPress={jest.fn()} onFabPress={jest.fn()} />);
    measure();
    // Its first frame still holds the starting zeros (a pill at x 0, beside Home), so it must be hidden.
    expect(getAnimatedStyle(screen.getByTestId('tab-indicator', hidden)).opacity).toBe(0);
    // One frame later it is on Profile, having jumped there rather than slid in from the left edge.
    settle(16);
    expectOnePillOn('profile');
  });

  it.each([false, true])(
    'moves ONE pill between any tabs and leaves nothing behind (Reduce Motion: %s)',
    (reduceMotion) => {
      if (reduceMotion) act(() => useThemePreferencesStore.getState().setReduceMotion('on'));
      render(<NavigatingBar />);
      measure();
      settle();
      expectOnePillOn('home');

      const tap = (name: string) => fireEvent.press(screen.getByRole('tab', { name }));
      for (const [name, tab] of [
        ['Profile', 'profile'],
        ['Home', 'home'],
        ['Insights', 'insights'],
        ['Profile', 'profile'],
      ] as const) {
        tap(name);
        settle();
        expectOnePillOn(tab);
      }

      // Rapid switching: each tap redirects the pill mid-flight; it settles on the last one.
      for (const name of ['Home', 'History', 'Insights', 'Profile', 'Home', 'Profile']) {
        tap(name);
        settle(40);
      }
      settle();
      expectOnePillOn('profile');
    },
  );
});

describe('toast helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows success toasts with an optional Undo action', () => {
    const undo = jest.fn();
    showSuccess({ title: "You're all set", sub: 'Tap + whenever you do something worth counting.' });
    showSuccess({ title: 'Checked in', undo });
    showInfo({ title: 'Coming soon' });

    expect(toast.success).toHaveBeenCalledWith("You're all set", {
      id: "You're all set",
      description: 'Tap + whenever you do something worth counting.',
      action: undefined,
      duration: 3500,
    });
    expect(toast.success).toHaveBeenLastCalledWith('Checked in', {
      id: 'Checked in',
      description: undefined,
      action: { label: 'Undo', onClick: undo },
      duration: 5000,
    });
    expect(toast.info).toHaveBeenCalledWith('Coming soon', {
      id: 'Coming soon',
      description: undefined,
      duration: 3000,
    });
  });

  it('keys toasts by title, so repeating a message refreshes it instead of stacking a duplicate', () => {
    showInfo({ title: "You're offline" });
    showInfo({ title: "You're offline" });
    const ids = jest.mocked(toast.info).mock.calls.map(([, options]) => options?.id);
    expect(ids).toEqual(["You're offline", "You're offline"]);
  });

  it('dismissAllToasts clears every toast', () => {
    dismissAllToasts();
    expect(toast.dismiss).toHaveBeenCalledWith();
  });
});
