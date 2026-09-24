import { ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * One shared spring for presses, sheets, tabs and screen changes.
 * `ReduceMotion.System` makes Reanimated jump straight to the end value when Reduce Motion is on.
 */
const spring: WithSpringConfig = { damping: 16, stiffness: 220, mass: 1, reduceMotion: ReduceMotion.System };

const timing = (duration: number): WithTimingConfig => ({ duration, reduceMotion: ReduceMotion.System });

export const motion = {
  spring,
  timing,
  duration: { fast: 120, base: 240, slow: 500 },
  press: { scale: 0.96, subtleScale: 0.985 },
  /** Onboarding hero: cells grow from 0.3 and fade in, staggered by column then row. */
  heroStagger: { columnMs: 40, rowMs: 15, durationMs: 500, fromScale: 0.3 },
  pulse: { scale: 1.45, durationMs: 600, repeats: 2 },
  crossFadeMs: 220,
} as const;
