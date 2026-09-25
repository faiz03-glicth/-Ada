import { act, renderHook } from '@testing-library/react-native';

import { buildLevelGrid } from '@/features/heatmap/domain/grid';
import { HeatCell } from '@/shared/ui/HeatCell';
import { Heatmap } from '@/shared/ui/Heatmap';
import { renderInScheme } from '@test/render';

import { buildTheme } from '../buildTheme';
import { heatRevealRules } from '../motion/cssMotion';
import { layoutMotion } from '../motion/layoutMotion';
import { useMotion } from '../motion/useMotion';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';

const prefs = () => useThemePreferencesStore.getState();
beforeEach(() => act(() => prefs().setReduceMotion('off')));

describe('the motion system', () => {
  it('offers every preset by meaning while motion is allowed', () => {
    const { result } = renderHook(() => useMotion());
    const rules = heatRevealRules(buildTheme('light', 'meadow', 'classic').heat);
    expect(rules).toHaveLength(5);
    expect(result.current.heatReveal(rules, 3, 120)).toMatchObject({
      animationDelay: 120,
      animationDuration: motion.heroStagger.durationMs,
    });
    expect(result.current.staggerIn(2)).toMatchObject({ animationDelay: 2 * motion.stagger.list });
    expect(result.current.selection(true)).not.toBeNull();
    expect(result.current.selection(false)).toBeNull();
    expect(result.current.pulse(true)).not.toBeNull();
  });

  it('resolves Reduce Motion in one place: every CSS preset becomes "show the final state"', () => {
    const { result } = renderHook(() => useMotion());
    act(() => prefs().setReduceMotion('on'));
    const rules = heatRevealRules(buildTheme('dark', 'meadow', 'classic').heat);
    expect(result.current.reduced).toBe(true);
    expect(result.current.heatReveal(rules, 3, 120)).toBeNull();
    expect(result.current.staggerIn(2)).toBeNull();
    expect(result.current.selection(true)).toBeNull();
    expect(result.current.pulse(true)).toBeNull();
  });

  it('pushes content in the direction of travel', () => {
    expect(layoutMotion.push.forward).toBeDefined();
    expect(layoutMotion.push.back).toBeDefined();
    expect(layoutMotion.push.forward).not.toBe(layoutMotion.push.back);
  });
});

describe('heatmap reveal parity', () => {
  const grid = buildLevelGrid(4, 7, (c, r) => ((c + r) % 5) as 0 | 1 | 2 | 3 | 4);
  const timingIn = (scheme: 'light' | 'dark') => {
    const { UNSAFE_getAllByType, unmount } = renderInScheme(
      <Heatmap grid={grid} cellSize={20} animateIn />,
      scheme,
    );
    // HeatCell is memoised; `.type` is the component inside the memo wrapper.
    const timing = UNSAFE_getAllByType(HeatCell.type).map(({ props }) => {
      const appear = props.appear;
      return appear && [appear.animationDelay, appear.animationDuration, appear.animationTimingFunction];
    });
    unmount();
    return timing;
  };

  it('reveals light and dark with the same timing: only the colours differ', () => {
    const light = timingIn('light');
    expect(light.every(Boolean)).toBe(true);
    expect(timingIn('dark')).toEqual(light);
  });

  it('shows the finished heatmap at once with Reduce Motion, in both themes', () => {
    act(() => prefs().setReduceMotion('on'));
    expect(timingIn('light').every((timing) => !timing)).toBe(true);
    expect(timingIn('dark').every((timing) => !timing)).toBe(true);
  });
});
