import type { CSSTransitionProperties } from 'react-native-reanimated';

import { cssEase, motion } from '../tokens/motion';
import { useReduceMotion } from './useReduceMotion';

type Speed = keyof typeof motion.speed;

/**
 * Declarative Reanimated CSS transition props for a component's visual state changes (selected, focused,
 * disabled, …): spread into an Animated component's style and the listed properties animate natively
 * whenever they change. Colour and opacity only — never `all`, never layout unless the caller means it.
 * With Reduce Motion the duration is 0, so the new state applies instantly.
 */
export function useStateTransition(
  property: CSSTransitionProperties['transitionProperty'],
  speed: Speed = 'fast',
): CSSTransitionProperties {
  const reduced = useReduceMotion();
  return {
    transitionProperty: property,
    transitionDuration: reduced ? 0 : motion.speed[speed],
    transitionTimingFunction: cssEase.standard,
  };
}
