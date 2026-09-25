import { css } from 'react-native-reanimated';

import { cssEase, motion } from '../tokens/motion';

const { heatmapReveal: reveal, staggerIn: rise, pulse } = motion;

/*
 * CSS animations (Reanimated's declarative keyframes): they run natively from a style, with no hooks per
 * element, which suits many small things (heat cells, list rows). They do NOT know about Reduce Motion, so
 * components never use these directly: they go through useMotion(), which resolves it once.
 *
 * None of them animates a colour. Every element keeps its own theme colour and only its opacity, scale or
 * position moves, so a preset looks the same in light, dark and glass.
 */

/**
 * When each day starts revealing: a sweep across the columns and down the rows, with a small, stable
 * per-cell nudge so the wave looks organic rather than mechanical.
 */
export function heatmapRevealDelay(column: number, row: number): number {
  const sweep = column * reveal.columnMs + row * reveal.rowMs;
  const nudge = ((column * 31 + row * 17) % 7) * 4;
  return sweep + nudge;
}

/** heatmapReveal: a day fades in and grows to full size, already in its level's colour. */
const grow = css.keyframes({
  from: { opacity: 0, transform: [{ scale: reveal.fromScale }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
});
export const heatmapReveal = (column: number, row: number) =>
  ({
    animationName: grow,
    animationDuration: reveal.durationMs,
    animationDelay: heatmapRevealDelay(column, row),
    animationTimingFunction: cssEase.emphasis,
    // Holds the first keyframe (hidden) while the cell waits for its turn.
    animationFillMode: 'backwards',
  }) as const;
export type HeatmapRevealStyle = ReturnType<typeof heatmapReveal> | ReturnType<typeof heatmapWave>;

/**
 * heatmapReveal, as a wave: the same fade-and-grow, diagonal by diagonal from the top-left day to the
 * bottom-right one, starting `afterMs` from now (e.g. once a flip has turned the mark back to face you).
 */
export const heatmapWave = (column: number, row: number, afterMs = 0) =>
  ({
    animationName: grow,
    animationDuration: reveal.durationMs,
    animationDelay: afterMs + (column + row) * reveal.waveStepMs,
    animationTimingFunction: cssEase.emphasis,
    animationFillMode: 'backwards',
  }) as const;

/**
 * staggerIn: list rows rising into place one after another (onboarding's intensity levels). While
 * `playing` is false the rows wait, hidden, at their first frame (e.g. on a page not reached yet), and
 * rise as soon as it turns true.
 */
const riseIn = css.keyframes({
  from: { opacity: 0, transform: [{ translateY: rise.distance }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
});
export const staggerIn = (index: number, playing = true) =>
  ({
    animationName: riseIn,
    animationDuration: rise.durationMs,
    animationDelay: index * rise.gapMs,
    animationTimingFunction: cssEase.enter,
    animationFillMode: 'backwards',
    animationPlayState: playing ? 'running' : 'paused',
  }) as const;

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
