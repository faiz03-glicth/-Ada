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
   * The liquid tab bar. The liquid is two bulbs joined by a neck: the head springs quickly to its target
   * (a small overshoot reads as the liquid compressing on arrival) while the softer tail lags behind, so
   * the liquid stretches while it travels and gathers back into one pill when it stops. Nothing loops:
   * once both springs settle the bar is completely still.
   */
  liquid: {
    head: {
      damping: 17,
      stiffness: 240,
      mass: 0.8,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    tail: {
      damping: 19,
      stiffness: 120,
      mass: 1,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    /** While dragging: the head follows the finger closely (smoothed, never teleporting); the tail still lags. */
    dragHead: {
      damping: 24,
      stiffness: 420,
      mass: 0.6,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    dragTail: {
      damping: 22,
      stiffness: 190,
      mass: 0.8,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    /** How a finger on the bar "engages" the liquid (drives magnification while dragging). */
    engage: {
      damping: 20,
      stiffness: 220,
      mass: 1,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    /** Shape at full stretch (bulbs one tab apart): each bulb shrinks and the neck thins, conserving volume. */
    shape: { headShrink: 0.1, tailShrink: 0.26, neckThin: 0.45 },
    /**
     * Icon magnification, by distance to the liquid (1 tab-spacing away = none): `peak` scale boost while
     * the liquid moves or is dragged, `rest` for the selected icon once still, and a small lift in points.
     * With the 1.3 falloff: 0% → 1.20×, 25% → 1.14×, 50% → 1.08×, 75% → 1.03×, 100% → 1.00×.
     */
    magnify: { peak: 0.2, rest: 0.05, liftPt: 3, falloffPower: 1.3, stretchGain: 2.5 },
    /** The footer's widest stretch toward the liquid's destination, as a fraction of its width. */
    footerStretch: 0.03,
    /** Reduce Motion: the liquid jumps, then fades in at the new tab (opacity only, so always played). */
    fade: { duration: 160, reduceMotion: ReduceMotion.Never } satisfies WithTimingConfig,
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
