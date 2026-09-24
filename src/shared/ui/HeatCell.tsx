import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatCellState } from '@/features/heatmap/domain/grid';
import { motion, type HeatLevel } from '@/theme';

export interface HeatCellProps {
  level: HeatLevel;
  size: number;
  radius?: number;
  state?: HeatCellState;
  /** Plays the "just checked in" pulse. */
  pulse?: boolean;
  /** Grow-and-fade entrance after this many ms (onboarding hero). */
  appearDelay?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** One day on the heatmap. Knows how a level looks, not which counts produce it. */
export function HeatCell({
  level,
  size,
  radius,
  state = 'default',
  pulse = false,
  appearDelay,
  onPress,
  accessibilityLabel,
}: HeatCellProps) {
  const reducedMotion = useReducedMotion();
  const animate = appearDelay !== undefined && !reducedMotion;
  const scale = useSharedValue(animate ? motion.heroStagger.fromScale : 1);
  const opacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    const timing = motion.timing(motion.heroStagger.durationMs);
    scale.set(withDelay(appearDelay, withTiming(1, timing)));
    opacity.set(withDelay(appearDelay, withTiming(1, timing)));
  }, [animate, appearDelay, scale, opacity]);

  useEffect(() => {
    if (!pulse || reducedMotion) return;
    const half = motion.timing(motion.pulse.durationMs / 2);
    scale.set(
      withRepeat(
        withSequence(withTiming(motion.pulse.scale, half), withTiming(1, half)),
        motion.pulse.repeats,
      ),
    );
  }, [pulse, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));
  const cell = (
    <Animated.View
      style={[styles.cell(level, size, radius ?? Math.max(2, Math.round(size / 3.5)), state), animatedStyle]}
    />
  );

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
}

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
