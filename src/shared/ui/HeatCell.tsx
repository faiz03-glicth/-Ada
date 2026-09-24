import { memo, useEffect } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatCellState } from '@/features/heatmap/domain/grid';
import { motion, type HeatLevel } from '@/theme';

/** A staggered entrance: every cell reads one shared clock (ms elapsed) and starts after its own delay. */
export interface HeatAppear {
  clock: SharedValue<number>;
  delayMs: number;
}

export interface HeatCellProps {
  level: HeatLevel;
  size: number;
  radius?: number;
  state?: HeatCellState;
  /** Plays the "just checked in" pulse. */
  pulse?: boolean;
  /** Grow-and-fade entrance driven by the parent heatmap's clock. */
  appear?: HeatAppear;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const { durationMs, fromScale } = motion.heroStagger;
// The same curve each cell's own withTiming used before, so the entrance looks unchanged.
const ease = Easing.inOut(Easing.quad);

/** Only cells that actually animate pay for shared values and a UI-thread style. */
function AnimatedCell({
  style,
  appear,
  pulse,
}: {
  style: StyleProp<ViewStyle>;
  appear?: HeatAppear;
  pulse: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const pulseScale = useSharedValue(1);
  const clock = appear?.clock;
  const delayMs = appear?.delayMs ?? 0;

  useEffect(() => {
    if (!pulse || reducedMotion) return;
    const half = motion.timing(motion.pulse.durationMs / 2);
    pulseScale.set(
      withRepeat(
        withSequence(withTiming(motion.pulse.scale, half), withTiming(1, half)),
        motion.pulse.repeats,
      ),
    );
  }, [pulse, reducedMotion, pulseScale]);

  const animated = useAnimatedStyle(() => {
    const progress = clock ? ease(Math.min(Math.max((clock.get() - delayMs) / durationMs, 0), 1)) : 1;
    return {
      opacity: progress,
      transform: [{ scale: (fromScale + (1 - fromScale) * progress) * pulseScale.get() }],
    };
  });

  return <Animated.View style={[style, animated]} />;
}

/** One day on the heatmap. Knows how a level looks, not which counts produce it. */
export const HeatCell = memo(function HeatCell({
  level,
  size,
  radius,
  state = 'default',
  pulse = false,
  appear,
  onPress,
  accessibilityLabel,
}: HeatCellProps) {
  const style = styles.cell(level, size, radius ?? Math.max(2, Math.round(size / 3.5)), state);
  const cell =
    appear || pulse ? <AnimatedCell style={style} appear={appear} pulse={pulse} /> : <View style={style} />;

  if (!onPress) return cell;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: state === 'selected' }}
    >
      {cell}
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  cell: (level: HeatLevel, size: number, radius: number, state: HeatCellState) => ({
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor: state === 'future' || state === 'blank' ? 'transparent' : theme.heat[level],
    borderWidth: state === 'future' ? 1 : 0,
    borderColor: theme.colors.border,
    outlineWidth: state === 'today' ? 1.5 : state === 'selected' ? 2 : 0,
    outlineOffset: 1.5,
    outlineColor: state === 'selected' ? theme.colors.accent : theme.colors.text,
  }),
}));
