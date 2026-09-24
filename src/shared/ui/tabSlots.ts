/*
 * PURE, worklet-safe geometry for the liquid tab bar. Positions are tab centres in bar coordinates, taken
 * from the measured layout (never hard-coded), so they follow any width, rotation or number of tabs.
 */

/** A tab's measured layout inside the bar. */
export interface TabFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where a tab sits along the bar. */
export interface TabSlot {
  id: string;
  center: number;
  width: number;
}

/** The tab whose centre is closest to `x`. */
export function nearestSlot(slots: readonly TabSlot[], x: number): TabSlot | null {
  'worklet';
  let best: TabSlot | null = null;
  let bestDistance = Infinity;
  for (const slot of slots) {
    const distance = Math.abs(slot.center - x);
    if (distance < bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }
  return best;
}

/** Keeps a dragged liquid between the first and last tab centre. */
export function clampToSlots(slots: readonly TabSlot[], x: number): number {
  'worklet';
  if (slots.length === 0) return x;
  let min = Infinity;
  let max = -Infinity;
  for (const slot of slots) {
    min = Math.min(min, slot.center);
    max = Math.max(max, slot.center);
  }
  return Math.min(Math.max(x, min), max);
}

/** Distance between neighbouring tab centres: the unit for stretch and magnification (≥ 1). */
export function slotSpacing(slots: readonly TabSlot[]): number {
  'worklet';
  let spacing = Infinity;
  for (const a of slots) {
    for (const b of slots) {
      const gap = Math.abs(a.center - b.center);
      if (gap > 0) spacing = Math.min(spacing, gap);
    }
  }
  if (spacing === Infinity) spacing = slots[0]?.width ?? 1;
  return Math.max(spacing, 1);
}

/** How far `x` is from the liquid spanning a…b (0 anywhere under it). */
export function distanceToSpan(x: number, a: number, b: number): number {
  'worklet';
  return Math.max(0, Math.min(a, b) - x, x - Math.max(a, b));
}

/** Magnification weight: 1 under the liquid, easing to 0 one tab-spacing away. */
export function falloff(distance: number, spacing: number, power: number): number {
  'worklet';
  const t = 1 - Math.min(distance / spacing, 1);
  return Math.pow(t, power);
}
