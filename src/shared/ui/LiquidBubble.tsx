import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { motion } from '@/theme';

interface LiquidBubbleProps {
  /** Vertical placement inside the bar; null until the tabs have been measured. */
  frame: { top: number; height: number } | null;
  head: SharedValue<number>;
  trail: SharedValue<number>;
  headWidth: SharedValue<number>;
  tailWidth: SharedValue<number>;
  stretch: SharedValue<number>;
  opacity: SharedValue<number>;
}

interface PillProps {
  center: SharedValue<number>;
  width: SharedValue<number>;
  height: number;
  stretch: SharedValue<number>;
  /** How much this end shrinks at full stretch. */
  shrink: number;
  testID?: string;
}

const { shape } = motion.liquid;
/** Reference length of the stretchable rectangles; they are scaled to the length they need. */
const SPAN = 100;

/**
 * A pill of any width drawn from two end circles and a middle rectangle, so its width animates with
 * transforms only and its round ends never distort (a scaled pill would turn them into ellipses).
 */
function LiquidPill({ center, width, height, stretch, shrink, testID }: PillProps) {
  const radius = height / 2;
  const left = useAnimatedStyle(() => {
    const s = 1 - shrink * stretch.get();
    const reach = (Math.max(width.get() - height, 0) / 2) * s;
    return { transform: [{ translateX: center.get() - reach - radius }, { scale: s }] };
  });
  const right = useAnimatedStyle(() => {
    const s = 1 - shrink * stretch.get();
    const reach = (Math.max(width.get() - height, 0) / 2) * s;
    return { transform: [{ translateX: center.get() + reach - radius }, { scale: s }] };
  });
  const middle = useAnimatedStyle(() => {
    const s = 1 - shrink * stretch.get();
    const span = Math.max(width.get() - height, 0) * s;
    return {
      transform: [
        { translateX: center.get() - SPAN / 2 },
        { scaleX: Math.max(span, 0.01) / SPAN },
        { scaleY: s },
      ],
    };
  });
  return (
    <>
      <Animated.View style={[styles.cap(height), left]} />
      <Animated.View style={[styles.span(height), middle]} />
      <Animated.View testID={testID} style={[styles.cap(height), right]} />
    </>
  );
}

/**
 * The ONE liquid highlight of the tab bar: a head and a trailing end joined by a neck. Gathered, it is a
 * single pill around the selected tab's icon and label; travelling, the ends pull apart (never more than
 * `maxReach`), shrink slightly and the neck thins, then it gathers again at the destination and takes that
 * tab's width. Only transforms and opacity animate (UI thread). Decorative: hidden from screen readers.
 */
export function LiquidBubble({
  frame,
  head,
  trail,
  headWidth,
  tailWidth,
  stretch,
  opacity,
}: LiquidBubbleProps) {
  const layer = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const neck = useAnimatedStyle(() => {
    const a = trail.get();
    const b = head.get();
    return {
      transform: [
        { translateX: (a + b) / 2 - SPAN / 2 },
        { scaleX: Math.max(Math.abs(b - a), 0.01) / SPAN },
        { scaleY: 1 - shape.neckThin * stretch.get() },
      ],
    };
  });

  if (!frame) return null;
  const { top, height } = frame;
  return (
    <Animated.View
      testID="tab-indicator"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.layer(top, height), layer]}
    >
      <Animated.View style={[styles.span(height), neck]} />
      <LiquidPill
        center={trail}
        width={tailWidth}
        height={height}
        stretch={stretch}
        shrink={shape.tailShrink}
      />
      <LiquidPill
        testID="liquid-head"
        center={head}
        width={headWidth}
        height={height}
        stretch={stretch}
        shrink={shape.headShrink}
      />
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
  span: (height: number) => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: SPAN,
    height,
    backgroundColor: theme.glass?.pill ?? theme.colors.accentSoft,
  }),
  cap: (height: number) => ({
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: height,
    height,
    borderRadius: height / 2,
    backgroundColor: theme.glass?.pill ?? theme.colors.accentSoft,
  }),
}));
