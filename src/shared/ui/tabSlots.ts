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

/** The measured size of a tab's content (icon above label). */
export interface ContentSize {
  width: number;
  height: number;
}

/** Where a tab sits along the bar, and how wide the liquid is when it rests there. */
export interface TabSlot {
  id: string;
  center: number;
  width: number;
}

export interface BubbleMetrics {
  /** Space between the content and the liquid's sides. */
  padX: number;
  /** The liquid is never narrower than this (a short label still gets a comfortable pill). */
  minWidth: number;
  /** How far the liquid may extend past its own tab on each side (so a long label is never clipped). */
  overhang: number;
}

/**
 * One slot per measured tab, in bar order: the liquid wraps the tab's content plus padding, clamped between
 * `minWidth` and the tab's width plus `overhang` each side. Until content is measured, the tab width is used.
 */
export function buildSlots(
  ids: readonly string[],
  frames: Partial<Record<string, TabFrame>>,
  contents: Partial<Record<string, ContentSize>>,
  { padX, minWidth, overhang }: BubbleMetrics,
): TabSlot[] {
  return ids.flatMap((id) => {
    const frame = frames[id];
    if (!frame) return [];
    const content = contents[id];
    const wanted = content ? content.width + padX * 2 : frame.width;
    const width = Math.min(Math.max(wanted, minWidth), frame.width + overhang * 2);
    return [{ id, center: frame.x + frame.width / 2, width }];
  });
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

/** Where the tail is drawn: at most `maxGap` behind the head, so the liquid stays one connected body. */
export function reachFrom(head: number, tail: number, maxGap: number): number {
  'worklet';
  return head + Math.min(Math.max(tail - head, -maxGap), maxGap);
}
