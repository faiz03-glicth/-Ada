import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

export const FAB_SIZE = 64;

const FAB_ACTIONS = [
  { name: 'activate' as const },
  { name: 'longpress' as const, label: 'Repeat last check-in' },
];

export interface TabBarFabProps {
  onPress: () => void;
  /** Holding +: a shortcut (repeat the last check-in). A hold never also counts as a tap. */
  onLongPress?: () => void;
}

/**
 * The raised centre "+" (new check-in), shared by both footers. With Liquid Glass it's lit from inside
 * (a soft highlight across its top) and ringed in frosted white; with Classic it's a flat green disc
 * ringed in the page colour. It squashes like a droplet when pressed (the motion system's liquid press).
 */
export function TabBarFab({ onPress, onLongPress }: TabBarFabProps) {
  const { theme } = useUnistyles();
  return (
    <PressableScale
      testID="fab-check-in"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      feedback="liquid"
      accessibilityRole="button"
      accessibilityLabel="New check-in"
      accessibilityHint={onLongPress ? 'Hold to repeat your last check-in' : undefined}
      accessibilityActions={onLongPress ? FAB_ACTIONS : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') onLongPress?.();
        else onPress();
      }}
      // The highlight is inline so React Native parses the gradient on every material change.
      style={[styles.fab, theme.glass && { experimental_backgroundImage: theme.glass.fab.highlight }]}
    >
      <Icon name="plus" size={30} strokeWidth={2.4} color={theme.colors.onAccent} />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  fab: {
    marginTop: -30,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderWidth: 5,
    borderColor: theme.glass?.fab.ring ?? theme.colors.canvas,
    boxShadow: theme.glass?.fab.shadow ?? theme.elevation.raised,
  },
}));
