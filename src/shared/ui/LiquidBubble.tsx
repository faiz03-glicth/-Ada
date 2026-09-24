import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { motion } from '@/theme';

export interface BubbleSize {
  top: number;
  width: number;
  height: number;
}

interface LiquidBubbleProps {
  /** Resting pill size and vertical position; null until the tabs have been measured. */
  size: BubbleSize | null;
  head: SharedValue<number>;
  tail: SharedValue<number>;
  stretch: SharedValue<number>;
  opacity: SharedValue<number>;
}

const { shape } = motion.liquid;
/** Reference length of the neck; it is scaled to the distance between the two bulbs. */
const NECK = 100;

/**
 * The liquid highlight: two pill-shaped bulbs joined by a neck. Gathered, the bulbs overlap into one pill;
 * travelling, the lagging tail and leading head pull apart, shrink a little and the neck thins, so it reads
 * as liquid rather than a scaled circle. Only transforms and opacity animate (UI thread). Decorative.
 */
export function LiquidBubble({ size, head, tail, stretch, opacity }: LiquidBubbleProps) {
  const half = (size?.width ?? 0) / 2;

  const layer = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const neck = useAnimatedStyle(() => {
    const a = tail.get();
    const b = head.get();
    return {
      transform: [
        { translateX: (a + b) / 2 - NECK / 2 },
        { scaleX: Math.max(Math.abs(b - a), 0.01) / NECK },
        { scaleY: 1 - shape.neckThin * stretch.get() },
      ],
    };
  });
  const headBulb = useAnimatedStyle(() => ({
    transform: [{ translateX: head.get() - half }, { scale: 1 - shape.headShrink * stretch.get() }],
  }));
  const tailBulb = useAnimatedStyle(() => ({
    transform: [{ translateX: tail.get() - half }, { scale: 1 - shape.tailShrink * stretch.get() }],
  }));

  if (!size) return null;
  return (
    <Animated.View
      testID="tab-indicator"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.layer(size.top, size.height), layer]}
    >
      <Animated.View style={[styles.neck(size.height), neck]} />
      <Animated.View testID="liquid-tail" style={[styles.bulb(size.width, size.height), tailBulb]} />
      <Animated.View testID="liquid-head" style={[styles.bulb(size.width, size.height), headBulb]} />
    </Animated.View>
  );
}

// Opaque fill: overlapping translucent shapes would show darker seams where they meet.
const styles = StyleSheet.create((theme) => ({
  layer: (top: number, height: number) => ({
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top,
    height,
  }),
  neck: (height: number) => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: NECK,
    height,
    backgroundColor: theme.glass?.pill ?? theme.colors.accentSoft,
  }),
  bulb: (width: number, height: number) => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width,
    height,
    borderRadius: height / 2,
    backgroundColor: theme.glass?.pill ?? theme.colors.accentSoft,
  }),
}));
