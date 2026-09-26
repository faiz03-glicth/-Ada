import { useCallback, useMemo, type RefObject } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { motion } from '@/theme';

import type { TabId, TabItem } from '../config/tabs';
import { GlassBlur } from './GlassBlur';
import { LiquidBubble } from './LiquidBubble';
import { TabBarFab, FAB_SIZE } from './TabBarFab';
import { TabBarItem } from './TabBarItem';
import { useLiquidTabBar } from './useLiquidTabBar';
import { useTabBarLayout } from './useTabBarLayout';

export interface LiquidTabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  onFabPress: () => void;
  onFabLongPress?: () => void;
  /** What the bar frosts (Android): the tab screens' BlurTarget. */
  blurTarget?: RefObject<View | null>;
}

// Read into a constant: a worklet that touched `motion` itself would copy the whole token object.
const { footerStretch } = motion.liquid;

/**
 * The Liquid Glass footer: a floating pane of frosted glass (a real blur of the page scrolling under it, a
 * translucent tint, light along its top edge) with ONE liquid highlight that flows between tabs. Navigation
 * state comes in through `active`; the liquid only draws it (useLiquidTabBar), so a tap navigates at once
 * and the animation never holds it up. Nothing here moves on its own: the bar is still until you touch it.
 *
 * Cost: the blur is the only per-frame work while the page scrolls, and it covers just the bar. The tint,
 * highlight and edge are static layers; the liquid and the bar's stretch are transforms on the UI thread.
 */
export function LiquidTabBar({
  items,
  active,
  onTabPress,
  onFabPress,
  onFabLongPress,
  blurTarget,
}: LiquidTabBarProps) {
  const { theme } = useUnistyles();
  const half = Math.ceil(items.length / 2);
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const layout = useTabBarLayout(ids, active, FAB_SIZE);

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

  const glass = theme.glass;
  return (
    <View style={styles.dock} pointerEvents="box-none">
      <GestureDetector gesture={liquid.pan}>
        <View style={styles.bar} accessibilityRole="tablist" onLayout={layout.measureBar}>
          <Animated.View pointerEvents="none" style={[styles.surface, surface]} testID="tab-bar-glass">
            <View style={styles.pane}>
              {glass && (
                <GlassBlur
                  intensity={glass.tabBar.blur}
                  scheme={theme.scheme}
                  target={blurTarget}
                  style={StyleSheet.absoluteFill}
                />
              )}
              {/* Inline, so React Native parses the gradient whenever the material or scheme changes. */}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: glass?.tabBar.tint,
                    experimental_backgroundImage: glass?.tabBar.highlight,
                  },
                ]}
              />
            </View>
            <View style={styles.edge} />
          </Animated.View>
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
            <TabBarFab onPress={onFabPress} onLongPress={onFabLongPress} />
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
    boxShadow: theme.glass?.tabBar.shadow,
  },
  // The frosted layers, clipped to the pill.
  pane: { ...StyleSheet.absoluteFillObject, borderRadius: theme.radii.pill, overflow: 'hidden' },
  // The glass edge, drawn over the pane so its light line sits on top of the frost.
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.glass?.card.edge ?? theme.colors.border,
    boxShadow: theme.glass?.tabBar.edgeLight,
  },
  // The FAB plus 2pt either side; the liquid keeps its own clearance from the FAB (useTabBarLayout).
  fabSlot: { width: FAB_SIZE + 4, alignItems: 'center' },
}));
