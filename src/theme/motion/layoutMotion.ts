import { FadeIn, FadeOut, Keyframe } from 'react-native-reanimated';

import { motion } from '../tokens/motion';

export type Direction = 'forward' | 'back';

const { speed, ease, distance } = motion;

/** Arrives from a short distance in the direction of travel, fading up, settling on the emphasized curve. */
const drift = (from: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateX: from }] },
    100: { opacity: 1, transform: [{ translateX: 0 }], easing: ease.emphasized },
  }).duration(speed.emphasized);

/**
 * Layout animations (Reanimated `entering` / `exiting`): how content arrives and leaves. They follow the
 * app's Reduce Motion by themselves (MotionRuntimeBridge sets Reanimated's global mode), so callers never
 * check it. Identical in light and dark: the theme only changes colours.
 */
export const layoutMotion = {
  /** Content appearing in place (a form's next step, a banner). */
  fade: FadeIn.duration(speed.normal),
  /** Content leaving: quick, no direction (a leaving view keeps its last render's props, which may be stale). */
  fadeOut: FadeOut.duration(speed.fast),
  /** A screen's content arriving in the direction of travel: the prototype's push/pop, scaled to a phone. */
  push: { forward: drift(distance.screen), back: drift(-distance.medium) } satisfies Record<
    Direction,
    unknown
  >,
  /** One control's content replaced in place (a button's label → "Connecting…"). */
  swap: FadeIn.duration(speed.fast),
};
