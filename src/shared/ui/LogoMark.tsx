import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { motion, useHoldMotion, useMotion, type HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';

const PATTERN: readonly HeatLevel[] = [2, 4, 3, 1, 3, 4, 3, 2, 4];
const COLUMNS = 3;
// The new face waves in as it turns back toward you (a quarter of the flip before it lands).
const WAVE_AFTER_TURN = motion.hold.flipMs / 4;

export interface LogoMarkProps {
  size?: number;
  /** The mark is a patch of heatmap, so it arrives like one: the motion system's heatmapReveal. */
  animateIn?: boolean;
  /**
   * Press and hold to play: the mark tenses and trembles while haptic ticks build up; held long enough, it
   * flips over and its heatmap waves back in, top-left to bottom-right. A tap is a light tick.
   */
  holdable?: boolean;
}

/** The Streak mark: a 3×3 patch of heatmap. Proportions scale from the 76pt login version. */
export function LogoMark({ size = 76, animateIn = false, holdable = false }: LogoMarkProps) {
  const motionSystem = useMotion();
  // Each completed hold draws the mark afresh (a new generation of cells, waving in).
  const [generation, setGeneration] = useState(0);
  const stopRamp = useRef<(() => void) | null>(null);
  const hold = useHoldMotion({
    // The release you feel and hear: a success tap, and the flip's sound (timed to the flip and the wave).
    onCharged: () => {
      haptics.success();
      sounds.play('logoFlip');
    },
    onTurn: () => setGeneration((current) => current + 1),
  });

  useEffect(() => () => stopRamp.current?.(), []);
  // Loaded before the first hold, so the sound starts exactly with the flip.
  useEffect(() => {
    if (holdable) sounds.preload('logoFlip');
  }, [holdable]);

  const padding = Math.round(size * (12 / 76));
  const gap = Math.max(2, Math.round(size * (4 / 76)));
  const cell = (size - 2 - padding * 2 - gap * 2) / 3;

  // Decorative either way: the mark carries no information, so screen readers skip it.
  const mark = (
    <Animated.View
      style={[styles.mark(size, padding, gap), holdable && hold.style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {PATTERN.map((level, index) => {
        const column = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        const appear =
          generation > 0
            ? motionSystem.heatmapWave(column, row, WAVE_AFTER_TURN)
            : animateIn
              ? motionSystem.heatmapReveal(column, row)
              : null;
        return (
          <HeatCell key={`${generation}:${index}`} level={level} size={cell} radius={4} appear={appear} />
        );
      })}
    </Animated.View>
  );

  if (!holdable) return mark;
  return (
    <Pressable
      testID="logo-mark"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onPressIn={() => {
        if (!hold.start()) return;
        stopRamp.current = haptics.ramp({ durationMs: motion.hold.chargeMs, gapMs: motion.hold.tickGapMs });
      }}
      onPressOut={() => {
        stopRamp.current?.();
        stopRamp.current = null;
        hold.cancel();
      }}
    >
      {mark}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  mark: (size: number, padding: number, gap: number) => ({
    width: size,
    height: size,
    padding,
    gap,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    borderRadius: Math.round(size * (22 / 76)),
    borderWidth: 1,
    borderColor: theme.glass?.card.edge ?? theme.colors.border,
    backgroundColor: theme.glass?.strong ?? theme.colors.surface,
    boxShadow: theme.elevation.card ?? undefined,
  }),
}));
