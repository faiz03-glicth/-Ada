/** Where a tab sits in the bar (its left edge and width). */
export interface TabSlot {
  id: string;
  x: number;
  width: number;
}

/** PURE, worklet-safe: the tab whose left edge is closest to `x` (used while dragging the highlight). */
export function nearestSlot(slots: readonly TabSlot[], x: number): TabSlot | null {
  'worklet';
  let best: TabSlot | null = null;
  let bestDistance = Infinity;
  for (const slot of slots) {
    const distance = Math.abs(slot.x - x);
    if (distance < bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }
  return best;
}

/** PURE, worklet-safe: keeps a dragged highlight between the first and last tab. */
export function clampToSlots(slots: readonly TabSlot[], x: number): number {
  'worklet';
  if (slots.length === 0) return x;
  let min = Infinity;
  let max = -Infinity;
  for (const slot of slots) {
    min = Math.min(min, slot.x);
    max = Math.max(max, slot.x);
  }
  return Math.min(Math.max(x, min), max);
}
