import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View, type AccessibilityActionEvent } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { centredSlot, motion, useReduceMotion, useWheelFocus, type HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';
import { Text } from './Text';

export interface WheelDay {
  /** Stable key (an ISO date). */
  key: string;
  /** Shown ABOVE the block: "T". */
  weekday: string;
  /** Shown BELOW the block: 17. */
  date: number;
  level: HeatLevel;
  today: boolean;
  /** Read by screen readers for the chosen day: "Thursday, 17 September, 3 check-ins". */
  label: string;
}

export interface DateWheelProps {
  days: readonly WheelDay[];
  /** The chosen day (the one under the centre pointer). The wheel starts there. */
  focusedIndex: number;
  /** A different day reached the centre (drag, fling, tap, screen reader): once per change. */
  onFocusChange: (index: number) => void;
  /** The chosen day was tapped (or activated): continue with it. Without it, tapping the centred day does nothing. */
  onConfirm?: (index: number) => void;
  /** Names the wheel for screen readers ("Days in September"). */
  accessibilityLabel: string;
  testID?: string;
}

const { slotWidth: SLOT, tickGapMs } = motion.datePicker;
const BLOCK = 40;
const MOVE_ACTIONS = [{ name: 'increment' as const }, { name: 'decrement' as const }];
const CONFIRM_ACTIONS = [...MOVE_ACTIONS, { name: 'activate' as const }];

/**
 * A horizontal wheel of days: drag it, and the day under the centre pointer is the chosen one. Nothing
 * needs precise aim: the finger moves the dates directly, the platform snaps the nearest date to the
 * centre on release (a flick carries on through several), and tapping any date glides it to the centre.
 *
 * - One source of truth: the parent's `focusedIndex`. The scroll position only decides which day is at
 *   the centre; when that changes, the wheel reports it once, with one soft haptic and one small wooden
 *   tick (at most one tick every `tickGapMs`, so a fast fling never rattles).
 * - While the dates move, nothing re-renders: each date's swell and fade follow the scroll position on the
 *   UI thread (the motion system's dateFocus). A change of day re-renders only the two dates whose ring
 *   moves.
 * - Screen readers get one adjustable control: swipe up/down to change the day (and, when `onConfirm` is
 *   given, double-tap to continue).
 */
export const DateWheel = memo(function DateWheel({
  days,
  focusedIndex,
  onFocusChange,
  onConfirm,
  accessibilityLabel,
  testID,
}: DateWheelProps) {
  const { width } = useWindowDimensions();
  const reduced = useReduceMotion();
  const ref = useAnimatedRef<Animated.ScrollView>();
  const count = days.length;
  const offset = useSharedValue(focusedIndex * SLOT);
  // Where the wheel opens. Never changed afterwards: a new contentOffset would make the native scroll view
  // jump there on the spot, even under a finger.
  const [start] = useState(focusedIndex);
  const [startOffset] = useState(() => ({ x: start * SLOT, y: 0 }));
  // Until the wheel is resting on its opening day it isn't choosing anything: Android places the initial
  // offset before the dates are laid out and scrolls on its own as they arrive, which must not count as
  // the person moving it (no haptic, no tick, no change of day). A finger ends this at once.
  const settled = useSharedValue(false);
  // The day at the centre as the UI thread last saw it, and a day being glided to (tap, screen reader):
  // the days passed on the way there aren't choices, so they make no sound.
  const centredOnUI = useSharedValue(focusedIndex);
  const gliding = useSharedValue(-1);
  const lastTick = useRef(0);

  useEffect(() => sounds.preload('dateTick'), []);

  /** One day reached the centre: tell the parent, and let it be felt and heard. */
  const arrive = useCallback(
    (index: number) => {
      haptics.selection();
      const now = Date.now();
      if (now - lastTick.current >= tickGapMs) {
        lastTick.current = now;
        sounds.play('dateTick');
      }
      onFocusChange(index);
    },
    [onFocusChange],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const x = event.contentOffset.x;
      offset.set(x);
      const index = centredSlot(x, count);
      if (!settled.get()) {
        if (index === start) settled.set(true);
        return;
      }
      if (gliding.get() >= 0) {
        if (index === gliding.get()) gliding.set(-1);
        return;
      }
      if (index !== centredOnUI.get()) {
        centredOnUI.set(index);
        scheduleOnRN(arrive, index);
      }
    },
    // A finger always wins, over a glide in progress or the opening placement.
    onBeginDrag: () => {
      gliding.set(-1);
      settled.set(true);
    },
  });

  /** Once the dates have a size, put the opening day under the pointer (Android ignores the early offset). */
  const place = useCallback(() => {
    scheduleOnUI(() => {
      if (!settled.get()) scrollTo(ref, start * SLOT, 0, false);
    });
  }, [ref, settled, start]);

  /** Bring a day to the centre from JS (a tap, a screen-reader swipe). */
  const glideTo = useCallback(
    (index: number) => {
      const target = Math.min(count - 1, Math.max(0, index));
      if (target === focusedIndex) return;
      arrive(target);
      const animated = !reduced;
      scheduleOnUI(() => {
        centredOnUI.set(target);
        gliding.set(animated ? target : -1);
        scrollTo(ref, target * SLOT, 0, animated);
      });
    },
    [arrive, centredOnUI, count, focusedIndex, gliding, reduced, ref],
  );

  // Slots get one stable handler, so a change of day re-renders only the two slots whose ring moves.
  const latest = useRef({ glideTo, onConfirm, focusedIndex });
  useEffect(() => {
    latest.current = { glideTo, onConfirm, focusedIndex };
  });
  const press = useCallback((index: number) => {
    const { focusedIndex: focused } = latest.current;
    if (index === focused) latest.current.onConfirm?.(index);
    else latest.current.glideTo(index);
  }, []);

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const action = event.nativeEvent.actionName;
    if (action === 'increment') glideTo(focusedIndex + 1);
    else if (action === 'decrement') glideTo(focusedIndex - 1);
    else if (action === 'activate') onConfirm?.(focusedIndex);
  };

  return (
    <View
      testID={testID}
      style={styles.wheel(width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: days[focusedIndex]?.label ?? '' }}
      accessibilityHint={
        onConfirm
          ? 'Swipe up or down to change the day, double-tap to open it'
          : 'Swipe up or down to change the day'
      }
      accessibilityActions={onConfirm ? CONFIRM_ACTIONS : MOVE_ACTIONS}
      onAccessibilityAction={onAccessibilityAction}
    >
      <Pointer />
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLOT}
        decelerationRate="fast"
        // Every frame (120 Hz phones too): the swell follows the dates exactly, never a frame behind.
        scrollEventThrottle={1}
        contentOffset={startOffset}
        onContentSizeChange={place}
        onScroll={onScroll}
        contentContainerStyle={styles.track((width - SLOT) / 2)}
      >
        {days.map((day, index) => (
          <WheelSlot
            key={day.key}
            day={day}
            index={index}
            offset={offset}
            focused={index === focusedIndex}
            onPress={press}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
});

/** The centre pointer: a short accent line above the chosen date. */
function Pointer() {
  const { theme } = useUnistyles();
  return <View pointerEvents="none" style={[styles.pointer, { backgroundColor: theme.colors.accent }]} />;
}

interface WheelSlotProps {
  day: WheelDay;
  index: number;
  offset: SharedValue<number>;
  focused: boolean;
  onPress: (index: number) => void;
}

/** One day: weekday above the block, date below; today carries a dot under its number. */
const WheelSlot = memo(function WheelSlot({ day, index, offset, focused, onPress }: WheelSlotProps) {
  const { theme } = useUnistyles();
  const focus = useWheelFocus(offset, index);
  return (
    <Pressable
      onPress={() => onPress(index)}
      style={styles.slot}
      accessible={false}
      testID={`wheel-${day.key}`}
    >
      <Animated.View style={[styles.column, focus]}>
        <Text
          variant="caption"
          tone={focused ? 'primary' : 'tertiary'}
          weight={focused ? 'semibold' : undefined}
        >
          {day.weekday}
        </Text>
        <HeatCell
          level={day.level}
          size={BLOCK}
          radius={12}
          state={focused ? 'selected' : day.today ? 'today' : 'default'}
        />
        <Text
          variant="sub"
          tone={focused ? 'primary' : 'secondary'}
          weight={focused ? 'semibold' : undefined}
        >
          {day.date}
        </Text>
        <View
          style={[styles.todayDot, { backgroundColor: day.today ? theme.colors.accent : 'transparent' }]}
        />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Full-bleed: dates slide in from the sheet's edges, not from inside its padding.
  wheel: (width: number) => ({ width, alignSelf: 'center' as const, paddingTop: 14 }),
  track: (side: number) => ({ paddingHorizontal: side, paddingVertical: 8 }),
  slot: { width: SLOT, alignItems: 'center', minHeight: 44 },
  column: { alignItems: 'center', gap: 6 },
  todayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: -2 },
  pointer: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 12,
    borderRadius: 1,
    zIndex: 1,
  },
});
