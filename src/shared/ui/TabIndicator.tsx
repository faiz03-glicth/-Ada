import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

export interface TabFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TabIndicatorProps {
  /** Size and vertical position of the active tab; null until the tabs have been measured. */
  frame: TabFrame | null;
  x: SharedValue<number>;
  /** 1 = round; above 1 = stretched wide (and squashed flat, like liquid). */
  stretch: SharedValue<number>;
}

/** The soft green highlight behind the active tab. Only transforms animate, so it stays on the UI thread. Decorative. */
export function TabIndicator({ frame, x, stretch }: TabIndicatorProps) {
  const liquid = useAnimatedStyle(() => {
    const amount = stretch.get();
    return {
      transform: [{ translateX: x.get() }, { scaleX: amount }, { scaleY: 1 - (amount - 1) * 0.45 }],
    };
  });

  if (!frame) return null;
  return (
    <Animated.View
      testID="tab-indicator"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.pill(frame.y, frame.width, frame.height), liquid]}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  pill: (top: number, width: number, height: number) => ({
    position: 'absolute' as const,
    left: 0,
    top,
    width,
    height,
    borderRadius: height / 2,
    backgroundColor: theme.glass?.pill ?? theme.colors.accentSoft,
  }),
}));
