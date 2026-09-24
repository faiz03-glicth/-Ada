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
  /**
   * With Reduce Motion: no sliding; screens and flow changes cross-fade. Tabs keep their cross-fade on
   * purpose: a dissolve is the recommended reduced-motion transition, and switching the tab navigator to
   * 'none' at runtime changes its native screen container (iOS), remounting every tab and blanking pages.
   */
  reducedNavigation: { push: 'fade', groupSwitch: 'fade', tabs: 'fade' },
  /**
   * The liquid tab bar: ONE liquid body with a leading head and a trailing tail. The head springs to the
   * new tab (a slight overshoot reads as the liquid compressing on arrival); the tail follows a little
   * behind, so the body stretches while it travels and gathers back into one pill when it stops. Nothing
   * loops: once both springs settle the bar is completely still.
   */
  liquid: {
    head: {
      damping: 22,
      stiffness: 300,
      mass: 0.8,
      reduceMotion: ReduceMotion.System,
    } satisfies WithSpringConfig,
    tail: {
      damping: 22,
      stiffness: 180,
      mass: 0.9,
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
      stiffness: 240,
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
    /**
     * Shape, in units of the distance between neighbouring tabs:
     * - `maxReach`: the tail is drawn at most this far behind the head, so on long jumps the body travels
     *   as one stretched drop and the old tab never keeps a second, "ghost" bubble;
     * - at full stretch each end shrinks a little (`headShrink`, `tailShrink`) and the neck thins to
     *   `1 - neckThin` of the height: thick enough to always read as one connected body.
     */
    shape: { maxReach: 0.8, headShrink: 0.06, tailShrink: 0.2, neckThin: 0.28 },
    /**
     * Icon magnification, by distance to the liquid (1 tab-spacing away = none): `peak` scale boost while
     * the liquid moves or is dragged, `rest` for the selected icon once still, and a small lift in points.
     * Sized so a magnified icon stays inside the bubble's padding.
     * With the 1.3 falloff: 0% → 1.16×, 25% → 1.11×, 50% → 1.06×, 75% → 1.03×, 100% → 1.00×.
     */
    magnify: { peak: 0.16, rest: 0.05, liftPt: 1.5, falloffPower: 1.3, stretchGain: 2.5 },
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
