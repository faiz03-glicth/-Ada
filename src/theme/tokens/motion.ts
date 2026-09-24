import { ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * One shared spring for presses, sheets, tabs and screen changes.
 * `ReduceMotion.System` makes Reanimated jump straight to the end value when Reduce Motion is on. The
 * app's own setting decides what "on" means (MotionRuntimeBridge), so it can override the phone.
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
  /**
   * Screen transitions: pushed screens slide in from the right on both platforms, tabs cross-fade
   * (calm, no sideways jump), and moving between the onboarding/login flow and the app cross-fades.
   */
  navigation: { push: 'ios_from_right', groupSwitch: 'fade', tabs: 'fade' },
  /** With Reduce Motion: no sliding. Screens and flow changes use a short cross-fade; tabs switch instantly. */
  reducedNavigation: { push: 'fade', groupSwitch: 'fade', tabs: 'none' },
  /**
   * The liquid tab highlight: it stretches wide and flat while travelling, then springs back round.
   * `maxDragStretch` caps how far a fast drag can stretch it.
   */
  liquid: {
    stretch: 1.22,
    stretchMs: 110,
    maxDragStretch: 1.35,
    slide: {
      damping: 15,
      stiffness: 190,
      mass: 0.9,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    settle: {
      damping: 11,
      stiffness: 210,
      mass: 0.8,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    /**
     * The + button: squashes wide and flat while held, then wobbles back like a droplet (the loose
     * release spring briefly overshoots into a tall, narrow stretch before settling).
     */
    press: {
      squashX: 1.1,
      squashY: 0.88,
      hold: {
        damping: 14,
        stiffness: 420,
        mass: 0.6,
        reduceMotion: ReduceMotion.System,
      } satisfies WithSpringConfig,
      release: {
        damping: 7,
        stiffness: 260,
        mass: 0.7,
        reduceMotion: ReduceMotion.System,
      } satisfies WithSpringConfig,
    },
  },
} as const;
