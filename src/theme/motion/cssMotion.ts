import { css, type CSSKeyframesRule } from 'react-native-reanimated';

import { cssEase, motion } from '../tokens/motion';
import type { HeatSteps } from '../types';

const { speed, distance, stagger, heroStagger, pulse } = motion;

/*
 * CSS animations (Reanimated's declarative keyframes): they run natively from a style, with no hooks per
 * element, which suits many small things (heat cells, list rows). They do NOT know about Reduce Motion, so
 * components never use these directly: they go through useMotion(), which resolves it once.
 */

/** The heat-reveal rule for each intensity level: the day appears empty, then fills with its colour. */
export type HeatRevealRules = readonly CSSKeyframesRule[];

export function heatRevealRules(heat: HeatSteps): HeatRevealRules {
  // Selectors are percentage strings: a bare number would have to be a 0–1 fraction.
  const appear = `${Math.round(heroStagger.appearShare * 100)}%`;
  return heat.map((color) =>
    css.keyframes({
      '0%': { opacity: 0, transform: [{ scale: heroStagger.fromScale }], backgroundColor: heat[0] },
      [appear]: { opacity: 1, transform: [{ scale: 1 }], backgroundColor: heat[0] },
      '100%': { opacity: 1, transform: [{ scale: 1 }], backgroundColor: color },
    }),
  );
}

export type HeatRevealStyle = ReturnType<typeof heatReveal>;

export const heatReveal = (rule: CSSKeyframesRule, delayMs: number) =>
  ({
    animationName: rule,
    animationDuration: heroStagger.durationMs,
    animationDelay: delayMs,
    animationTimingFunction: cssEase.emphasized,
    // Holds the first keyframe (hidden) while the cell waits for its turn.
    animationFillMode: 'backwards',
  }) as const;

/** staggerIn: list rows rising into place one after another (onboarding's intensity levels). */
const rise = css.keyframes({
  from: { opacity: 0, transform: [{ translateY: distance.small }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
});
export const staggerIn = (index: number) =>
  ({
    animationName: rise,
    animationDuration: speed.normal,
    animationDelay: index * stagger.list,
    animationTimingFunction: cssEase.enter,
    animationFillMode: 'backwards',
  }) as const;

/**
 * selection: the tactile response of something becoming selected (an activity's icon). Played once each
 * time it's selected; deselecting just lets the colours ease back.
 */
const swell = css.keyframes({
  '0%': { transform: [{ scale: 1 }] },
  '40%': { transform: [{ scale: 1.1 }] },
  '75%': { transform: [{ scale: 0.98 }] },
  '100%': { transform: [{ scale: 1 }] },
});
export const selection = {
  animationName: swell,
  animationDuration: speed.normal,
  animationTimingFunction: cssEase.standard,
} as const;

/** pulse: the "just checked in" beat on a heat cell. */
export const checkInPulse = {
  animationName: css.keyframes({
    '0%': { transform: [{ scale: 1 }] },
    '50%': { transform: [{ scale: pulse.scale }] },
    '100%': { transform: [{ scale: 1 }] },
  }),
  animationDuration: pulse.durationMs,
  animationIterationCount: pulse.repeats,
  animationTimingFunction: cssEase.standard,
} as const;
