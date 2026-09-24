import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { motion } from '@/theme';

import type { TabId, TabItem } from '../config/tabs';
import { Icon } from './Icon';
import { LiquidBubble } from './LiquidBubble';
import { PressableScale } from './PressableScale';
import { TabBarItem } from './TabBarItem';
import { useLiquidTabBar } from './useLiquidTabBar';
import { useTabBarLayout } from './useTabBarLayout';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  onFabPress: () => void;
}

const FAB = 64;
// Read into a constant: a worklet that touched `motion` itself would copy the whole token object.
const { footerStretch } = motion.liquid;

/**
 * Floating liquid tab bar: two tabs, a raised centre "+" (new check-in), two tabs. Navigation state comes
 * in through `active`; the liquid only draws it (useLiquidTabBar), so a tap navigates immediately and the
 * animation can never hold it up. Everything is measured (useTabBarLayout), so the liquid always wraps
 * its tab's icon and label, on any width, orientation or font size; the bar sits above the safe area.
 */
export function TabBar({ items, active, onTabPress, onFabPress }: TabBarProps) {
  const { theme } = useUnistyles();
  const half = Math.ceil(items.length / 2);
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const layout = useTabBarLayout(ids, active, FAB);

  const selectById = useCallback(
    (id: string) => {
      const tab = items.find((item) => item.id === id);
      if (tab) onTabPress(tab.id);
    },
    [items, onTabPress],
  );
  const liquid = useLiquidTabBar({ active, slots: layout.slots, onSelect: selectById });

  // The bar grows toward the liquid's destination (its far edge stays put) and flattens a touch.
  const { head, trail, stretch } = liquid;
  const { barWidth } = layout;
  const surface = useAnimatedStyle(() => {
    const grow = footerStretch * stretch.get();
    const direction = Math.sign(head.get() - trail.get());
    return {
      transform: [
        { translateX: (direction * grow * barWidth.get()) / 2 },
        { scaleX: 1 + grow },
        { scaleY: 1 - grow * 0.4 },
      ],
    };
  });

  const renderTab = (item: TabItem) => {
    const frame = layout.frames[item.id];
    return (
      <TabBarItem
        key={item.id}
        item={item}
        selected={item.id === active}
        center={frame ? frame.x + frame.width / 2 : null}
        labelMaxWidth={layout.labels[item.id]}
        head={head}
        trail={trail}
        amp={liquid.amp}
        spacing={liquid.spacing}
        onPress={() => {
          // Navigation first; the liquid starts in the same tap instead of waiting for the next render.
          onTabPress(item.id);
          liquid.moveTo(item.id);
        }}
        onLayout={(event) => layout.measureTab(item.id, event)}
        onContentLayout={(event) => layout.measureContent(item.id, event)}
      />
    );
  };

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <GestureDetector gesture={liquid.pan}>
        <View style={styles.bar} accessibilityRole="tablist" onLayout={layout.measureBar}>
          <Animated.View pointerEvents="none" style={[styles.surface, surface]} />
          <LiquidBubble
            frame={layout.bubble}
            head={head}
            trail={trail}
            headWidth={liquid.headWidth}
            tailWidth={liquid.tailWidth}
            stretch={stretch}
            opacity={liquid.opacity}
          />
          {items.slice(0, half).map(renderTab)}
          <View style={styles.fabSlot} onLayout={layout.measureFab}>
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

const styles = StyleSheet.create((theme, rt) => ({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Math.max(rt.insets.bottom, theme.spacing.md),
    paddingHorizontal: theme.spacing.gutter,
    alignItems: 'center',
  },
  // Slim side padding: every point goes to the tabs, so labels keep room inside the liquid.
  bar: { width: '100%', maxWidth: 520, flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4 },
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
  // The FAB plus 2pt either side; the liquid keeps its own clearance from the FAB (useTabBarLayout).
  fabSlot: { width: FAB + 4, alignItems: 'center' },
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
