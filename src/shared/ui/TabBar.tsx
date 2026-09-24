import { useCallback, useMemo, useState } from 'react';
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
import { buildSlots, type BubbleMetrics, type ContentSize, type TabFrame } from './tabSlots';
import { useLiquidTabBar } from './useLiquidTabBar';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  onFabPress: () => void;
}

/**
 * The liquid wraps each tab's icon + label with 14pt of breathing room each side and 6pt above and below
 * (room for the icon's magnification too), is at least 64pt wide, and may reach 6pt past its tab so a
 * long label on a narrow phone is never clipped.
 */
const BUBBLE: BubbleMetrics = { padX: 14, minWidth: 64, overhang: 6 };
const BUBBLE_PAD_Y = 6;

const sameSize = (a: ContentSize | undefined, b: ContentSize) =>
  a !== undefined && a.width === b.width && a.height === b.height;
const sameFrame = (a: TabFrame | undefined, b: TabFrame) =>
  sameSize(a, b) && a !== undefined && a.x === b.x && a.y === b.y;

/**
 * Floating liquid tab bar: two tabs, a raised centre "+" (new check-in), two tabs. Navigation state comes
 * in through `active`; the liquid only draws it (useLiquidTabBar), so a tap navigates immediately and the
 * animation can never hold it up. Tabs and their contents are measured, so it fits any width, orientation
 * or label; it sits above the safe area.
 */
export function TabBar({ items, active, onTabPress, onFabPress }: TabBarProps) {
  const { theme } = useUnistyles();
  const [frames, setFrames] = useState<Partial<Record<TabId, TabFrame>>>({});
  const [contents, setContents] = useState<Partial<Record<TabId, ContentSize>>>({});
  const barWidth = useSharedValue(0);
  const half = Math.ceil(items.length / 2);

  const slots = useMemo(
    () =>
      buildSlots(
        items.map((item) => item.id),
        frames,
        contents,
        BUBBLE,
      ),
    [items, frames, contents],
  );
  const selectById = useCallback(
    (id: string) => {
      const tab = items.find((item) => item.id === id);
      if (tab) onTabPress(tab.id);
    },
    [items, onTabPress],
  );
  const liquid = useLiquidTabBar({ active, slots, onSelect: selectById });

  const measureTab = useCallback((id: TabId, { nativeEvent }: LayoutChangeEvent) => {
    const { x, y, width, height } = nativeEvent.layout;
    const frame = { x, y, width, height };
    setFrames((current) => (sameFrame(current[id], frame) ? current : { ...current, [id]: frame }));
  }, []);
  const measureContent = useCallback((id: TabId, { nativeEvent }: LayoutChangeEvent) => {
    const size = { width: nativeEvent.layout.width, height: nativeEvent.layout.height };
    setContents((current) => (sameSize(current[id], size) ? current : { ...current, [id]: size }));
  }, []);

  // The bar grows toward the liquid's destination (its far edge stays put) and flattens a touch.
  const { head, trail, stretch } = liquid;
  const surface = useAnimatedStyle(() => {
    const grow = motion.liquid.footerStretch * stretch.get();
    const direction = Math.sign(head.get() - trail.get());
    return {
      transform: [
        { translateX: (direction * grow * barWidth.get()) / 2 },
        { scaleX: 1 + grow },
        { scaleY: 1 - grow * 0.4 },
      ],
    };
  });

  // Every tab shares one bubble height: the tallest content plus padding, centred on the tab row.
  const row = frames[active];
  const tallest = Math.max(0, ...Object.values(contents).map((size) => size?.height ?? 0));
  const bubbleHeight = tallest > 0 ? tallest + BUBBLE_PAD_Y * 2 : (row?.height ?? 0);
  const bubble = row ? { top: row.y + (row.height - bubbleHeight) / 2, height: bubbleHeight } : null;

  const renderTab = (item: TabItem) => {
    const frame = frames[item.id];
    return (
      <TabBarItem
        key={item.id}
        item={item}
        selected={item.id === active}
        center={frame ? frame.x + frame.width / 2 : null}
        head={head}
        trail={trail}
        amp={liquid.amp}
        spacing={liquid.spacing}
        onPress={() => {
          // Navigation first; the liquid starts in the same tap instead of waiting for the next render.
          onTabPress(item.id);
          liquid.moveTo(item.id);
        }}
        onLayout={(event) => measureTab(item.id, event)}
        onContentLayout={(event) => measureContent(item.id, event)}
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
          <LiquidBubble
            frame={bubble}
            head={head}
            trail={trail}
            headWidth={liquid.headWidth}
            tailWidth={liquid.tailWidth}
            stretch={stretch}
            opacity={liquid.opacity}
          />
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
    backgroundColor: theme.glass?.tabBar ?? theme.colors.surfaceRaised,
    boxShadow: theme.elevation.card ?? undefined,
  },
  // The FAB (64) plus 6pt either side: narrower than before, leaving the tabs more room for the liquid.
  fabSlot: { width: FAB + 12, alignItems: 'center' },
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
