import type { ComponentProps } from 'react';
import type { GestureResponderEvent, PressableProps } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { motion, useReduceMotion } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { press: liquid } = motion.liquid;

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Any animated style, including Reanimated CSS transitions (see useStateTransition). */
  style?: ComponentProps<typeof AnimatedPressable>['style'];
  /** How far the control shrinks while pressed (0.94–0.98). Ignored by the liquid feedback. */
  scaleTo?: number;
  /**
   * 'scale' (default): shrinks on press-in, springs back on release.
   * 'liquid': squashes wide and flat while held, then wobbles back like a droplet (the + button).
   */
  feedback?: 'scale' | 'liquid';
}

/** The shared press feedback. Decorative, so it is skipped entirely with Reduce Motion. */
export function PressableScale({
  scaleTo = motion.press.scale,
  feedback = 'scale',
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReduceMotion();
  const isLiquid = feedback === 'liquid';
  // 0 = at rest, 1 = fully pressed. Springs may overshoot past either end, which is what makes it wobble.
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const p = pressed.get();
    if (isLiquid) {
      return {
        transform: [{ scaleX: 1 + (liquid.squashX - 1) * p }, { scaleY: 1 + (liquid.squashY - 1) * p }],
      };
    }
    return { transform: [{ scale: 1 + (scaleTo - 1) * p }] };
  });

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!reducedMotion) {
      pressed.set(isLiquid ? withSpring(1, liquid.hold) : withTiming(1, motion.timing(motion.speed.fast)));
    }
    onPressIn?.(event);
  };
  const handlePressOut = (event: GestureResponderEvent) => {
    // Always released (also if Reduce Motion turned on mid-press); ReduceMotion.System makes it a jump then.
    pressed.set(withSpring(0, isLiquid ? liquid.release : motion.spring));
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
}
