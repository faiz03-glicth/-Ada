import { useCallback, useEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { motion } from '../tokens/motion';

const { hold, ease, spring } = motion;
const half = hold.flipMs / 2;
// The charge is a timer as much as a look: it must run its full length even with Reduce Motion.
const charging = { duration: hold.chargeMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never };
const shiver = {
  duration: hold.tremblePeriodMs / 2,
  easing: Easing.linear,
  reduceMotion: ReduceMotion.Never,
};

export interface HoldMotionEvents {
  /** Held long enough: the charge is full (the flip starts now). */
  onCharged: () => void;
  /** The flip is edge-on: the moment to change what the face shows. Also called with Reduce Motion. */
  onTurn: () => void;
}

/**
 * hold: press and hold to charge something up. While held it tenses and trembles more and more; held for
 * `hold.chargeMs` it flips (edge-on at the halfway point, so its face can change unseen) and settles.
 * Let go early and it springs back. Only one flip at a time; everything stops cleanly on unmount.
 * With Reduce Motion nothing moves, but the hold still completes (events fire, the face still changes).
 *
 * Pair it with a haptic ramp for the feel (haptics.ramp) — this hook only owns the motion.
 */
export function useHoldMotion({ onCharged, onTurn }: HoldMotionEvents) {
  const reduced = useReduceMotion();
  const charge = useSharedValue(0);
  const tremble = useSharedValue(0);
  const flip = useSharedValue(0);
  // A flip is under way: presses wait until it lands.
  const flipping = useRef(false);

  const landed = useCallback(() => {
    flipping.current = false;
  }, []);

  // Leaving the screen mid-charge or mid-flip: stop, so no callback fires for a screen that's gone
  // (a cancelled animation reports `finished: false`, which schedules nothing).
  useEffect(
    () => () => {
      cancelAnimation(charge);
      cancelAnimation(tremble);
      cancelAnimation(flip);
    },
    [charge, tremble, flip],
  );

  const complete = useCallback(() => {
    flipping.current = true;
    onCharged();
    cancelAnimation(tremble);
    tremble.set(0);
    charge.set(withSpring(0, spring));
    if (reduced) {
      onTurn();
      flipping.current = false;
      return;
    }
    flip.set(0);
    flip.set(
      withSequence(
        withTiming(0.5, { duration: half, easing: ease.exit }, (finished) => {
          if (finished) scheduleOnRN(onTurn);
        }),
        withTiming(1, { duration: half, easing: ease.enter }, (finished) => {
          if (finished) scheduleOnRN(landed);
        }),
      ),
    );
  }, [charge, flip, tremble, reduced, onCharged, onTurn, landed]);

  const style = useAnimatedStyle(() => {
    const c = charge.get();
    const p = flip.get();
    // 0 → 90° (edge-on), then -90° → 0: the face turning away and a new one turning in, never mirrored.
    const angle = p < 0.5 ? p * 180 : (p - 1) * 180;
    return {
      transform: [
        { perspective: hold.perspective },
        { rotateY: `${angle}deg` },
        { scale: 1 - (1 - hold.squeeze) * c },
        { rotateZ: `${tremble.get() * hold.trembleDeg * c}deg` },
      ],
    };
  });

  return {
    style,
    /** A finger went down. Returns false if a flip is still landing (the press is ignored). */
    start: (): boolean => {
      if (flipping.current) return false;
      charge.set(
        withTiming(1, charging, (finished) => {
          if (finished) scheduleOnRN(complete);
        }),
      );
      if (!reduced) {
        tremble.set(
          withRepeat(withSequence(withTiming(1, shiver), withTiming(-1, shiver), withTiming(0, shiver)), -1),
        );
      }
      return true;
    },
    /** The finger lifted before the charge was full: settle back. */
    cancel: () => {
      if (flipping.current) return;
      cancelAnimation(tremble);
      tremble.set(withTiming(0, motion.timing(motion.duration.fast)));
      charge.set(withSpring(0, spring));
    },
  };
}
