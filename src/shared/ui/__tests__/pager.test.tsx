/*
 * When a pager page counts as landed (and is set down with a clack). The scroll wiring itself can't run
 * under Jest (Reanimated's scroll handler is a native worklet there), so it's checked on a device.
 */
import { motion } from '@/theme/tokens/motion';

import { landedPage } from '../Pager';

const { landWithin } = motion.pager;

describe('a pager page landing', () => {
  it('lands once it has settled on a new page', () => {
    expect(landedPage(1, 0, 3)).toBe(1);
    expect(landedPage(1 - landWithin / 2, 0, 3)).toBe(1);
    expect(landedPage(2 + landWithin / 2, 1, 3)).toBe(2);
  });

  it('has not landed while still on its way, or when it snaps back to where it was', () => {
    expect(landedPage(0.5, 0, 3)).toBeNull();
    expect(landedPage(1 - landWithin * 3, 0, 3)).toBeNull();
    expect(landedPage(0, 0, 3)).toBeNull();
  });

  it('never lands beyond the first or last page (overscroll)', () => {
    expect(landedPage(-0.01, 1, 3)).toBe(0);
    expect(landedPage(2.01, 1, 3)).toBe(2);
    expect(landedPage(2.01, 2, 3)).toBeNull();
  });
});
