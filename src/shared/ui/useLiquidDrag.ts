import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withSpring, type SharedValue, type WithSpringConfig } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { motion } from '@/theme';

import { clampToSlots, nearestSlot, type TabSlot } from './tabSlots';

interface Options {
  /** The liquid's ends (position and width), owned by useLiquidTabBar. */
  ends: {
    head: SharedValue<number>;
    tail: SharedValue<number>;
    headWidth: SharedValue<number>;
    tailWidth: SharedValue<number>;
  };
  slots: SharedValue<readonly TabSlot[]>;
  activeId: SharedValue<string>;
  /** 0 → 1 while a finger holds the liquid (drives magnification). */
  engaged: SharedValue<number>;
  /** Set when a release selects a new tab, so the navigation change doesn't animate the liquid twice. */
  releasedFromDrag: SharedValue<boolean>;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

const { liquid } = motion;

/**
 * Dragging the liquid along the bar: it follows the finger with a little smoothing (springs, never a
 * teleport), ticks a haptic as it crosses tabs, and on release settles on the nearest tab and selects it.
 * Runs entirely on the UI thread; only the selection and the haptic tick call back into JS.
 */
export function useLiquidDrag({
  ends,
  slots,
  activeId,
  engaged,
  releasedFromDrag,
  reducedMotion,
  onSelect,
}: Options) {
  const dragging = useSharedValue(false);
  const hovered = useSharedValue('');
  const tick = useCallback(() => haptics.selection(), []);

  return useMemo(() => {
    const { head, tail, headWidth, tailWidth } = ends;
    const follow = (slot: TabSlot, x: number, headSpring: WithSpringConfig, tailSpring: WithSpringConfig) => {
      'worklet';
      if (reducedMotion) {
        head.set(x);
        tail.set(x);
        headWidth.set(slot.width);
        tailWidth.set(slot.width);
        return;
      }
      head.set(withSpring(x, headSpring));
      tail.set(withSpring(x, tailSpring));
      headWidth.set(withSpring(slot.width, headSpring));
      tailWidth.set(withSpring(slot.width, tailSpring));
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
          const slot = nearestSlot(list, x);
          if (!slot) return;
          follow(slot, x, liquid.dragHead, liquid.dragTail);
          if (slot.id !== hovered.get()) {
            hovered.set(slot.id);
            scheduleOnRN(tick);
          }
        })
        .onEnd((event) => {
          const list = slots.get();
          const slot = nearestSlot(list, clampToSlots(list, event.x));
          if (!slot) return;
          follow(slot, slot.center, liquid.head, liquid.tail);
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
          if (!success && current) follow(current, current.center, liquid.head, liquid.tail);
        })
    );
  }, [ends, slots, activeId, engaged, releasedFromDrag, reducedMotion, onSelect, dragging, hovered, tick]);
}
