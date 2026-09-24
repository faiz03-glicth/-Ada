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

/** A horizontal stretch of the bar (e.g. the + button, or a tab's content). */
export interface Span {
  left: number;
  right: number;
}

/** What the liquid must stay clear of: the bar's own ends and anything else in the row (the + button). */
export interface BarGeometry {
  bounds: Span;
  obstacles: readonly Span[];
}

export interface BubbleMetrics {
  /** Space between the content and the liquid's sides. */
  padX: number;
  /** The liquid's preferred minimum width (a short label still gets a comfortable pill). */
  minWidth: number;
  /** Clearance kept from the bar's ends, the + button and other tabs' content. */
  gap: number;
}

/** Half the width available around `center` before touching the bar's ends, an obstacle or `others`. */
export function roomAround(
  center: number,
  geometry: BarGeometry,
  others: readonly Span[],
  gap: number,
): number {
  let room = Math.min(center - geometry.bounds.left, geometry.bounds.right - center) - gap;
  for (const span of [...geometry.obstacles, ...others]) {
    if (span.right <= center) room = Math.min(room, center - span.right - gap);
    else if (span.left >= center) room = Math.min(room, span.left - center - gap);
  }
  return Math.max(room, 0);
}

const centerOf = (frame: TabFrame) => frame.x + frame.width / 2;
const around = (center: number, width: number): Span => ({
  left: center - width / 2,
  right: center + width / 2,
});

/**
 * One slot per measured tab, in bar order: the liquid wraps the tab's content plus padding, but never
 * reaches the bar's ends, the + button or a neighbouring tab's content. Unmeasured content uses the tab width.
 */
export function buildSlots(
  ids: readonly string[],
  frames: Partial<Record<string, TabFrame>>,
  contents: Partial<Record<string, ContentSize>>,
  geometry: BarGeometry,
  { padX, minWidth, gap }: BubbleMetrics,
): TabSlot[] {
  return ids.flatMap((id) => {
    const frame = frames[id];
    if (!frame) return [];
    const center = centerOf(frame);
    const neighbours = ids.flatMap((other) => {
      const f = frames[other];
      return other !== id && f ? [around(centerOf(f), contents[other]?.width ?? 0)] : [];
    });
    const content = contents[id];
    const wanted = Math.max(content ? content.width + padX * 2 : frame.width, minWidth);
    return [{ id, center, width: Math.min(wanted, roomAround(center, geometry, neighbours, gap) * 2) }];
  });
}

/**
 * The widest each tab's label may be so the liquid can still wrap it with `padX` either side. It only
 * depends on the bar's geometry and the neighbours' icons (never on measured labels), so it can't feed back
 * into itself; a label that is wider (large system font) shrinks to fit instead of touching the edge.
 */
export function labelLimits(
  ids: readonly string[],
  frames: Partial<Record<string, TabFrame>>,
  geometry: BarGeometry,
  { padX, gap }: BubbleMetrics,
  iconSize: number,
): Partial<Record<string, number>> {
  const limits: Partial<Record<string, number>> = {};
  for (const id of ids) {
    const frame = frames[id];
    if (!frame) continue;
    const icons = ids.flatMap((other) => {
      const f = frames[other];
      return other !== id && f ? [around(centerOf(f), iconSize)] : [];
    });
    limits[id] = Math.max((roomAround(centerOf(frame), geometry, icons, gap) - padX) * 2, iconSize);
  }
  return limits;
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
