import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { toast } from 'sonner-native';

import { TAB_ITEMS } from '@/shared/config/tabs';
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

  it('TabBar shows the sliding highlight once tabs are measured, sized to the active tab', () => {
    const layout = (x: number) => ({ nativeEvent: { layout: { x, y: 8, width: 70, height: 48 } } });
    const { theme, rerender } = renderInScheme(
      <TabBar items={TAB_ITEMS} active="home" onTabPress={jest.fn()} onFabPress={jest.fn()} />,
      scheme,
    );
    // Decorative and hidden from screen readers; absent until the tabs have been laid out.
    expect(screen.queryByTestId('tab-indicator', { includeHiddenElements: true })).toBeNull();

    fireEvent(screen.getByTestId('tab-home'), 'layout', layout(10));
    fireEvent(screen.getByTestId('tab-insights'), 'layout', layout(80));
    const pill = screen.getByTestId('tab-indicator', { includeHiddenElements: true });
    expect(styleOf(pill)).toMatchObject({
      width: 70,
      height: 48,
      top: 8,
      backgroundColor: theme.colors.accentSoft,
    });

    rerender(<TabBar items={TAB_ITEMS} active="insights" onTabPress={jest.fn()} onFabPress={jest.fn()} />);
    expect(screen.getByTestId('tab-indicator', { includeHiddenElements: true })).toBeTruthy();
  });

  it('dragging the highlight along the bar selects the tab it is released on', async () => {
    const onTabPress = jest.fn();
    renderInScheme(
      <TabBar items={TAB_ITEMS} active="home" onTabPress={onTabPress} onFabPress={jest.fn()} />,
      scheme,
    );
    const layout = (x: number) => ({ nativeEvent: { layout: { x, y: 8, width: 70, height: 48 } } });
    fireEvent(screen.getByTestId('tab-home'), 'layout', layout(10));
    fireEvent(screen.getByTestId('tab-insights'), 'layout', layout(80));
    fireEvent(screen.getByTestId('tab-history'), 'layout', layout(234));
    fireEvent(screen.getByTestId('tab-profile'), 'layout', layout(304));

    act(() => {
      fireGestureHandler(getByGestureTestId('tab-bar-drag'), [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: 40, velocityX: 600 },
        { translationX: 230, velocityX: 900 },
        { state: State.END, translationX: 230 },
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
