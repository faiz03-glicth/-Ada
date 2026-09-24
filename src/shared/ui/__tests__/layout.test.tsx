import { fireEvent, screen } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { TAB_ITEMS } from '@/shared/config/tabs';
import { renderInScheme, SCHEMES } from '@test/render';

import { PhasePlaceholder } from '../PhasePlaceholder';
import { Screen } from '../Screen';
import { TabBar } from '../TabBar';
import { Text } from '../Text';
import { showInfo, showSuccess } from '../toast';

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

  it('PhasePlaceholder names the phase and has a working back button', () => {
    const onBack = jest.fn();
    renderInScheme(<PhasePlaceholder title="Heatmap" phase={2} onBack={onBack} />, scheme);
    expect(screen.getByRole('header', { name: 'Coming in Phase 2' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('toast helpers', () => {
  it('shows success toasts with an optional Undo action', () => {
    const undo = jest.fn();
    showSuccess({ title: "You're all set", sub: 'Tap + whenever you do something worth counting.' });
    showSuccess({ title: 'Checked in', undo });
    showInfo({ title: 'Coming soon' });

    expect(toast.success).toHaveBeenCalledWith("You're all set", {
      description: 'Tap + whenever you do something worth counting.',
      action: undefined,
      duration: 3500,
    });
    expect(toast.success).toHaveBeenLastCalledWith('Checked in', {
      description: undefined,
      action: { label: 'Undo', onClick: undo },
      duration: 5000,
    });
    expect(toast.info).toHaveBeenCalledWith('Coming soon', { description: undefined, duration: 3000 });
  });
});
