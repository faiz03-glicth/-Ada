import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { motion } from '@/theme';

import type { TabFrame } from './TabIndicator';
import { clampToSlots, nearestSlot, type TabSlot } from './tabSlots';

interface Options {
  active: string;
  frames: Partial<Record<string, TabFrame>>;
  /** Called when a drag is released over a different tab. */
  onSelect: (id: string) => void;
}

const { liquid } = motion;

/**
 * Liquid-glass behaviour for the tab highlight:
 * - on every page change it stretches wide and flat, slides, and springs back round, with a soft haptic;
 * - it can be dragged along the bar (light ticks as it crosses tabs) and settles on the nearest tab.
 * Stretching is skipped with Reduce Motion; the slide then jumps (ReduceMotion.System).
 */
export function useLiquidTabIndicator({ active, frames, onSelect }: Options) {
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(0);
  const stretch = useSharedValue(1);
  const slots = useSharedValue<TabSlot[]>([]);
  const startX = useSharedValue(0);
  const hovered = useSharedValue('');
  // Read by the drag gesture on the UI thread, so these are shared values rather than refs.
  const activeId = useSharedValue(active);
  const releasedFromDrag = useSharedValue(false);
  const placed = useRef(false);
  const previous = useRef(active);
  const targetX = frames[active]?.x;

  useEffect(() => {
    activeId.set(active);
  }, [active, activeId]);

  useEffect(() => {
    const measured = Object.entries(frames).flatMap(([id, frame]) =>
      frame ? [{ id, x: frame.x, width: frame.width }] : [],
    );
    slots.set(measured);
  }, [frames, slots]);

  useEffect(() => {
    if (targetX === undefined) return;
    const changed = previous.current !== active;
    previous.current = active;
    if (changed) haptics.soft();
    if (!placed.current) {
      x.set(targetX);
      placed.current = true;
      return;
    }
    if (releasedFromDrag.get()) {
      // The drag release already animated the highlight onto this tab.
      releasedFromDrag.set(false);
      return;
    }
    x.set(withSpring(targetX, liquid.slide));
    if (changed && !reducedMotion) {
      stretch.set(
        withSequence(
          withTiming(liquid.stretch, { duration: liquid.stretchMs }),
          withSpring(1, liquid.settle),
        ),
      );
    }
  }, [active, targetX, reducedMotion, x, stretch, releasedFromDrag]);

  const tick = useCallback(() => haptics.selection(), []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('tab-bar-drag')
        // Horizontal drags only; taps and vertical scrolls fall through to the tabs.
        .activeOffsetX([-10, 10])
        .failOffsetY([-20, 20])
        .onStart(() => {
          startX.set(x.get());
          hovered.set(nearestSlot(slots.get(), x.get())?.id ?? '');
        })
        .onUpdate((event) => {
          const list = slots.get();
          const next = clampToSlots(list, startX.get() + event.translationX);
          x.set(next);
          if (!reducedMotion) {
            stretch.set(Math.min(1 + Math.abs(event.velocityX) / 2400, liquid.maxDragStretch));
          }
          const slot = nearestSlot(list, next);
          if (slot && slot.id !== hovered.get()) {
            hovered.set(slot.id);
            scheduleOnRN(tick);
          }
        })
        .onEnd(() => {
          const slot = nearestSlot(slots.get(), x.get());
          stretch.set(withSpring(1, liquid.settle));
          if (slot) {
            x.set(withSpring(slot.x, liquid.slide));
            if (slot.id !== activeId.get()) {
              releasedFromDrag.set(true);
              scheduleOnRN(onSelect, slot.id);
            }
          }
        }),
    [activeId, hovered, onSelect, reducedMotion, releasedFromDrag, slots, startX, stretch, tick, x],
  );

  return { x, stretch, pan };
}
