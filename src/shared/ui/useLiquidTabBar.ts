import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptics } from '@/shared/lib/haptics';
import { motion, useReduceMotion } from '@/theme';

import { reachFrom, slotSpacing, type TabSlot } from './tabSlots';
import { useLiquidDrag } from './useLiquidDrag';

interface Options {
  active: string;
  /** Measured tabs, in bar order (see buildSlots). */
  slots: readonly TabSlot[];
  /** Called when a drag is released over a different tab. */
  onSelect: (id: string) => void;
}

const { liquid } = motion;
const sameSlot = (a: TabSlot | null, b: TabSlot) =>
  a !== null && a.center === b.center && a.width === b.width;

/**
 * Animation state for the liquid tab bar, kept apart from navigation state. Navigation decides the tab;
 * this only draws it. Everything that changes per frame lives in shared values on the UI thread, so the
 * liquid never re-renders React, and nothing here ever triggers or delays navigation.
 *
 * - `head`/`trail`: the two ends of ONE liquid body; `trail` is capped at `maxReach` behind the head.
 * - `headWidth`/`tailWidth`: the body's width at each end, sized to the destination tab's content.
 * - New targets retarget the springs from wherever they are, so rapid taps redirect instead of queueing.
 * - With Reduce Motion the liquid jumps and fades in; there is no stretch or magnification.
 */
export function useLiquidTabBar({ active, slots: measured, onSelect }: Options) {
  const reducedMotion = useReduceMotion();
  const head = useSharedValue(0);
  const tail = useSharedValue(0);
  const headWidth = useSharedValue(0);
  const tailWidth = useSharedValue(0);
  const engaged = useSharedValue(0);
  const opacity = useSharedValue(1);
  const slots = useSharedValue<readonly TabSlot[]>([]);
  // Read by the drag gesture on the UI thread, so these are shared values rather than refs.
  const activeId = useSharedValue(active);
  const releasedFromDrag = useSharedValue(false);
  const target = useRef<TabSlot | null>(null);
  const previous = useRef(active);

  const spacing = slotSpacing(measured);
  const maxGap = liquid.shape.maxReach * spacing;
  const activeSlot = measured.find((slot) => slot.id === active);

  const trail = useDerivedValue(() => reachFrom(head.get(), tail.get(), maxGap));
  const stretch = useDerivedValue(() => Math.min(Math.abs(head.get() - trail.get()) / spacing, 1));
  const amp = useDerivedValue(() => {
    if (reducedMotion) return 0;
    const { peak, rest, stretchGain } = liquid.magnify;
    return rest + (peak - rest) * Math.min(Math.max(stretch.get() * stretchGain, engaged.get()), 1);
  });

  const place = useCallback(
    (slot: TabSlot) => {
      target.current = slot;
      head.set(slot.center);
      tail.set(slot.center);
      headWidth.set(slot.width);
      tailWidth.set(slot.width);
    },
    [head, tail, headWidth, tailWidth],
  );

  const flowTo = useCallback(
    (slot: TabSlot) => {
      if (sameSlot(target.current, slot)) return;
      if (reducedMotion) {
        place(slot);
        opacity.set(0);
        opacity.set(withTiming(1, liquid.fade));
        return;
      }
      target.current = slot;
      head.set(withSpring(slot.center, liquid.head));
      tail.set(withSpring(slot.center, liquid.tail));
      headWidth.set(withSpring(slot.width, liquid.head));
      tailWidth.set(withSpring(slot.width, liquid.tail));
    },
    [reducedMotion, place, head, tail, headWidth, tailWidth, opacity],
  );

  /** Tap: the liquid starts at once, without waiting for the navigator to re-render. */
  const moveTo = useCallback(
    (id: string) => {
      const slot = measured.find((candidate) => candidate.id === id);
      if (slot) flowTo(slot);
    },
    [measured, flowTo],
  );

  useEffect(() => {
    activeId.set(active);
  }, [active, activeId]);

  useEffect(() => {
    slots.set(measured);
  }, [measured, slots]);

  useEffect(() => {
    if (!activeSlot) return;
    const changed = previous.current !== active;
    previous.current = active;
    if (changed) haptics.soft();
    if (changed && releasedFromDrag.get()) {
      // The drag release already sent the liquid to this tab.
      releasedFromDrag.set(false);
      target.current = activeSlot;
      return;
    }
    // A new tab, or the same tab re-measured (e.g. its label weight): flow. Rotation/resize: just sit there.
    if (changed || target.current?.center === activeSlot.center) flowTo(activeSlot);
    else place(activeSlot);
  }, [active, activeSlot, flowTo, place, releasedFromDrag]);

  const ends = useMemo(() => ({ head, tail, headWidth, tailWidth }), [head, tail, headWidth, tailWidth]);
  const pan = useLiquidDrag({
    ends,
    slots,
    activeId,
    engaged,
    releasedFromDrag,
    reducedMotion,
    onSelect,
  });

  return { head, trail, headWidth, tailWidth, stretch, amp, opacity, spacing, pan, moveTo };
}
