import { memo } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { css, cubicBezier } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatCellState } from '@/features/heatmap/domain/grid';
import { motion, useReduceMotion, type HeatLevel } from '@/theme';

export interface HeatCellProps {
  level: HeatLevel;
  size: number;
  radius?: number;
  state?: HeatCellState;
  /** Plays the "just checked in" pulse (skipped with Reduce Motion). */
  pulse?: boolean;
  /**
   * Grow-and-fade entrance starting after this many ms. The caller decides whether to animate at all
   * (Heatmap leaves it out with Reduce Motion), so a grid of cells doesn't each subscribe to the setting.
   */
  appearDelayMs?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const { durationMs, fromScale } = motion.heroStagger;

/*
 * Declarative Reanimated CSS animations: they run natively from the style alone, so an animated cell
 * costs no hooks, shared values or worklets. That keeps a 98-cell hero cheap to mount.
 */
// Easing.inOut(Easing.quad) as a cubic-bezier: the curve these animations have always used.
const easeInOutQuad = cubicBezier(0.455, 0.03, 0.515, 0.955);

const appear = css.keyframes({
  from: { opacity: 0, transform: [{ scale: fromScale }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
});

const PULSE = {
  animationName: css.keyframes({
    '0%': { transform: [{ scale: 1 }] },
    '50%': { transform: [{ scale: motion.pulse.scale }] },
    '100%': { transform: [{ scale: 1 }] },
  }),
  animationDuration: motion.pulse.durationMs,
  animationIterationCount: motion.pulse.repeats,
  animationTimingFunction: easeInOutQuad,
} as const;

/** 'backwards': the cell holds the first keyframe (hidden, small) while it waits for its turn. */
const appearAnimation = (delayMs: number) =>
  ({
    animationName: appear,
    animationDuration: durationMs,
    animationDelay: delayMs,
    animationTimingFunction: easeInOutQuad,
    animationFillMode: 'backwards',
  }) as const;

function PulsingCell({ style }: { style: StyleProp<ViewStyle> }) {
  const reducedMotion = useReduceMotion();
  return <Animated.View style={[style, reducedMotion ? null : PULSE]} />;
}

/** One day on the heatmap. Knows how a level looks, not which counts produce it. */
export const HeatCell = memo(function HeatCell({
  level,
  size,
  radius,
  state = 'default',
  pulse = false,
  appearDelayMs,
  onPress,
  accessibilityLabel,
}: HeatCellProps) {
  const style = styles.cell(level, size, radius ?? Math.max(2, Math.round(size / 3.5)), state);
  const cell =
    appearDelayMs !== undefined ? (
      <Animated.View style={[style, appearAnimation(appearDelayMs)]} />
    ) : pulse ? (
      <PulsingCell style={style} />
    ) : (
      <View style={style} />
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
