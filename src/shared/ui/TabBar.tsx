import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { motion } from '@/theme';

import type { TabId, TabItem } from '../config/tabs';
import { Icon } from './Icon';
import { LiquidBubble } from './LiquidBubble';
import { PressableScale } from './PressableScale';
import { TabBarItem } from './TabBarItem';
import type { TabFrame } from './tabSlots';
import { useLiquidTabBar } from './useLiquidTabBar';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  onFabPress: () => void;
}

type Frames = Partial<Record<TabId, TabFrame>>;

/** Gap between a tab's edges and the liquid resting on it. */
const BUBBLE_INSET = 4;

const sameFrame = (a: TabFrame | undefined, b: TabFrame) =>
  a !== undefined && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/**
 * Floating liquid tab bar: two tabs, a raised centre "+" (new check-in), two tabs. A liquid highlight
 * flows between tabs (and can be dragged along the bar), icons magnify as it passes, and the bar itself
 * stretches slightly toward where the liquid is heading. It sits above the safe area and re-measures its
 * tabs on every layout, so it fits any width or orientation.
 */
export function TabBar({ items, active, onTabPress, onFabPress }: TabBarProps) {
  const { theme } = useUnistyles();
  const [frames, setFrames] = useState<Frames>({});
  const barWidth = useSharedValue(0);
  const half = Math.ceil(items.length / 2);

  const selectById = useCallback(
    (id: string) => {
      const tab = items.find((item) => item.id === id);
      if (tab) onTabPress(tab.id);
    },
    [items, onTabPress],
  );
  const liquid = useLiquidTabBar({ active, frames, onSelect: selectById });
  const { head, tail, stretch, amp, spacing, moveTo } = liquid;

  const measure = useCallback((id: TabId, { nativeEvent }: LayoutChangeEvent) => {
    const { x, y, width, height } = nativeEvent.layout;
    const frame = { x, y, width, height };
    setFrames((current) => (sameFrame(current[id], frame) ? current : { ...current, [id]: frame }));
  }, []);

  // The bar grows toward the liquid's destination (its far edge stays put) and flattens a touch.
  const surface = useAnimatedStyle(() => {
    const grow = motion.liquid.footerStretch * stretch.get();
    const direction = Math.sign(head.get() - tail.get());
    return {
      transform: [
        { translateX: (direction * grow * barWidth.get()) / 2 },
        { scaleX: 1 + grow },
        { scaleY: 1 - grow * 0.4 },
      ],
    };
  });

  const activeFrame = frames[active];
  const bubble = activeFrame
    ? {
        top: activeFrame.y + BUBBLE_INSET,
        width: Math.min(activeFrame.width - BUBBLE_INSET * 2, 76),
        height: activeFrame.height - BUBBLE_INSET * 2,
      }
    : null;

  const renderTab = (item: TabItem) => {
    const frame = frames[item.id];
    return (
      <TabBarItem
        key={item.id}
        item={item}
        selected={item.id === active}
        center={frame ? frame.x + frame.width / 2 : null}
        head={head}
        tail={tail}
        amp={amp}
        spacing={spacing}
        onPress={() => {
          // Navigation first; the liquid starts at once rather than waiting for the navigator to re-render.
          onTabPress(item.id);
          moveTo(item.id);
        }}
        onLayout={(event) => measure(item.id, event)}
      />
    );
  };

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <GestureDetector gesture={liquid.pan}>
        <View
          style={styles.bar}
          accessibilityRole="tablist"
          onLayout={(event) => barWidth.set(event.nativeEvent.layout.width)}
        >
          <Animated.View pointerEvents="none" style={[styles.surface, surface]} />
          <LiquidBubble size={bubble} head={head} tail={tail} stretch={stretch} opacity={liquid.opacity} />
          {items.slice(0, half).map(renderTab)}
          <View style={styles.fabSlot}>
            <PressableScale
              testID="fab-check-in"
              onPress={onFabPress}
              feedback="liquid"
              accessibilityRole="button"
              accessibilityLabel="New check-in"
              style={styles.fab}
            >
              <Icon name="plus" size={30} strokeWidth={2.4} color={theme.colors.onAccent} />
            </PressableScale>
          </View>
          {items.slice(half).map(renderTab)}
        </View>
      </GestureDetector>
    </View>
  );
}

const FAB = 64;

const styles = StyleSheet.create((theme, rt) => ({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Math.max(rt.insets.bottom, theme.spacing.md),
    paddingHorizontal: theme.spacing.gutter,
    alignItems: 'center',
  },
  bar: { width: '100%', maxWidth: 520, flexDirection: 'row', padding: 6 },
  surface: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.glass?.card.edge ?? theme.colors.border,
    backgroundColor: theme.glass?.tabBar ?? theme.colors.surface,
    boxShadow: theme.elevation.card ?? undefined,
  },
  fabSlot: { width: 84, alignItems: 'center' },
  fab: {
    marginTop: -30,
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderWidth: 5,
    borderColor: theme.colors.canvas,
    boxShadow: theme.elevation.raised,
  },
}));
