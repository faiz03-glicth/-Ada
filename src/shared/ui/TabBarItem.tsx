import type { LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { motion } from '@/theme';

import type { TabItem } from '../config/tabs';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { distanceToSpan, falloff } from './tabSlots';
import { Text } from './Text';

export interface TabBarItemProps {
  item: TabItem;
  selected: boolean;
  /** This tab's centre in bar coordinates; null until measured. */
  center: number | null;
  head: SharedValue<number>;
  tail: SharedValue<number>;
  amp: SharedValue<number>;
  spacing: number;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

const { magnify } = motion.liquid;

/**
 * One tab. Its icon magnifies (and lifts slightly) by distance to the liquid: strongest under it, fading
 * out one tab away. Only a transform on the icon changes, so the layout never shifts. Selection itself is
 * shown by colour, weight and accessibility state, never by the animation alone.
 */
export function TabBarItem({
  item,
  selected,
  center,
  head,
  tail,
  amp,
  spacing,
  onPress,
  onLayout,
}: TabBarItemProps) {
  const { theme } = useUnistyles();
  const color = selected ? theme.colors.accentText : theme.colors.text3;

  const magnified = useAnimatedStyle(() => {
    if (center === null) return { transform: [{ translateY: 0 }, { scale: 1 }] };
    const weight = falloff(distanceToSpan(center, tail.get(), head.get()), spacing, magnify.falloffPower);
    const boost = amp.get() * weight;
    return { transform: [{ translateY: -magnify.liftPt * (boost / magnify.peak) }, { scale: 1 + boost }] };
  });

  return (
    <PressableScale
      testID={`tab-${item.id}`}
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected }}
      style={styles.tab}
    >
      <Animated.View testID={`tab-${item.id}-icon`} style={magnified}>
        <Icon name={item.icon} size={24} color={color} />
      </Animated.View>
      <Text variant="mini" weight={selected ? 'semibold' : 'medium'} style={{ color }}>
        {item.label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
});
