import { useMemo } from 'react';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { checkInPulse, heatReveal, selection, staggerIn, type HeatRevealRules } from './cssMotion';

/**
 * The motion system for components: the CSS presets, already resolved against the app's Reduce Motion
 * (each returns null when motion is reduced, so the element simply shows its final state). Components ask
 * for a preset by meaning and never check Reduce Motion themselves. Layout animations come from
 * `layoutMotion`, which handles Reduce Motion on its own.
 */
export function useMotion() {
  const reduced = useReduceMotion();
  return useMemo(
    () => ({
      reduced,
      /** A heat cell's reveal: pass the level's rule and when the cell starts. */
      heatReveal: (rules: HeatRevealRules, level: number, delayMs: number) => {
        const rule = rules[level];
        return reduced || !rule ? null : heatReveal(rule, delayMs);
      },
      staggerIn: (index: number) => (reduced ? null : staggerIn(index)),
      /** Pass whether the element just became selected; the swell plays once each time. */
      selection: (justSelected: boolean) => (reduced || !justSelected ? null : selection),
      pulse: (active: boolean) => (reduced || !active ? null : checkInPulse),
    }),
    [reduced],
  );
}
