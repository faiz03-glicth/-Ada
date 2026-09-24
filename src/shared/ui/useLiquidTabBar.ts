import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { motion, useReduceMotion } from '@/theme';

import { clampToSlots, nearestSlot, slotSpacing, type TabFrame, type TabSlot } from './tabSlots';

interface Options {
  active: string;
  frames: Partial<Record<string, TabFrame>>;
  /** Called when a drag is released over a different tab. */
  onSelect: (id: string) => void;
}

const { liquid } = motion;

/**
 * Animation state for the liquid tab bar, kept apart from navigation state: everything that changes per
 * frame lives in shared values on the UI thread, so moving the liquid never re-renders React.
 *
 * - `head`/`tail`: the two ends of the liquid (tab-centre coordinates). New targets retarget the springs
 *   from wherever they are, so rapid taps redirect the liquid instead of queueing animations.
 * - `stretch`: 0 when gathered, 1 when the ends are a tab apart. `amp`: magnification strength.
 * - `moveTo(id)`: called on tap so the liquid starts moving immediately; navigation changes made in code
 *   (or by a drag) are followed through `active`.
 * - With Reduce Motion the liquid jumps and fades in; there is no stretch or magnification.
 */
export function useLiquidTabBar({ active, frames, onSelect }: Options) {
  const reducedMotion = useReduceMotion();
  const head = useSharedValue(0);
  const tail = useSharedValue(0);
  const engaged = useSharedValue(0);
  const dragging = useSharedValue(false);
  const opacity = useSharedValue(1);
  const slots = useSharedValue<TabSlot[]>([]);
  const hovered = useSharedValue('');
  // Read by the drag gesture on the UI thread, so these are shared values rather than refs.
  const activeId = useSharedValue(active);
  const releasedFromDrag = useSharedValue(false);
  const target = useRef<number | null>(null);
  const previous = useRef(active);

  const measured = useMemo<TabSlot[]>(
    () =>
      Object.entries(frames).flatMap(([id, frame]) =>
        frame ? [{ id, center: frame.x + frame.width / 2, width: frame.width }] : [],
      ),
    [frames],
  );
  const spacing = slotSpacing(measured);
  const activeCenter = measured.find((slot) => slot.id === active)?.center;

  const stretch = useDerivedValue(() => Math.min(Math.abs(head.get() - tail.get()) / spacing, 1));
  const amp = useDerivedValue(() => {
    if (reducedMotion) return 0;
    const { peak, rest, stretchGain } = liquid.magnify;
    return rest + (peak - rest) * Math.min(Math.max(stretch.get() * stretchGain, engaged.get()), 1);
  });

  const place = useCallback(
    (center: number) => {
      target.current = center;
      head.set(center);
      tail.set(center);
    },
    [head, tail],
  );

  const flowTo = useCallback(
    (center: number) => {
      if (target.current === center) return;
      target.current = center;
      if (reducedMotion) {
        head.set(center);
        tail.set(center);
        opacity.set(0);
        opacity.set(withTiming(1, liquid.fade));
        return;
      }
      head.set(withSpring(center, liquid.head));
      tail.set(withSpring(center, liquid.tail));
    },
    [reducedMotion, head, tail, opacity],
  );

  /** Tap: start moving now, before the navigator re-renders with the new tab. */
  const moveTo = useCallback(
    (id: string) => {
      const center = measured.find((slot) => slot.id === id)?.center;
      if (center !== undefined) flowTo(center);
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
    if (activeCenter === undefined) return;
    const changed = previous.current !== active;
    previous.current = active;
    if (changed) haptics.soft();
    if (!changed) {
      // First layout, rotation or resize: sit on the tab without animating.
      if (target.current !== activeCenter) place(activeCenter);
      return;
    }
    if (releasedFromDrag.get()) {
      // The drag release already sent the liquid to this tab.
      releasedFromDrag.set(false);
      target.current = activeCenter;
      return;
    }
    flowTo(activeCenter);
  }, [active, activeCenter, flowTo, place, releasedFromDrag]);

  const tick = useCallback(() => haptics.selection(), []);

  const pan = useMemo(() => {
    const follow = (x: number, headSpring: WithSpringConfig, tailSpring: WithSpringConfig) => {
      'worklet';
      if (reducedMotion) {
        head.set(x);
        tail.set(x);
      } else {
        head.set(withSpring(x, headSpring));
        tail.set(withSpring(x, tailSpring));
      }
    };
    return (
      Gesture.Pan()
        .withTestId('tab-bar-drag')
        // Horizontal drags only; taps and vertical scrolls fall through to the tabs.
        .activeOffsetX([-10, 10])
        .failOffsetY([-20, 20])
        .onStart(() => {
          dragging.set(true);
          if (!reducedMotion) engaged.set(withSpring(1, liquid.engage));
          hovered.set(activeId.get());
        })
        .onUpdate((event) => {
          const list = slots.get();
          const x = clampToSlots(list, event.x);
          follow(x, liquid.dragHead, liquid.dragTail);
          const slot = nearestSlot(list, x);
          if (slot && slot.id !== hovered.get()) {
            hovered.set(slot.id);
            scheduleOnRN(tick);
          }
        })
        .onEnd((event) => {
          const list = slots.get();
          const slot = nearestSlot(list, clampToSlots(list, event.x));
          if (!slot) return;
          follow(slot.center, liquid.head, liquid.tail);
          if (slot.id !== activeId.get()) {
            releasedFromDrag.set(true);
            scheduleOnRN(onSelect, slot.id);
          }
        })
        .onFinalize((_event, success) => {
          // Plain taps also end here (the pan never started); they must not touch the liquid.
          if (!dragging.get()) return;
          dragging.set(false);
          engaged.set(withSpring(0, liquid.engage));
          // A drag interrupted (e.g. by a system gesture) flows back to the selected tab.
          const current = slots.get().find((slot) => slot.id === activeId.get());
          if (!success && current) follow(current.center, liquid.head, liquid.tail);
        })
    );
  }, [
    activeId,
    dragging,
    engaged,
    head,
    hovered,
    onSelect,
    reducedMotion,
    releasedFromDrag,
    slots,
    tail,
    tick,
  ]);

  return { head, tail, stretch, amp, opacity, spacing, pan, moveTo };
}
