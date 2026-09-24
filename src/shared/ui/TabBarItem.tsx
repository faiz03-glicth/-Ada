import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { motion } from '@/theme';

import type { TabItem } from '../config/tabs';
import { Crossfade } from './Crossfade';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { distanceToSpan, falloff } from './tabSlots';
import { Text } from './Text';
import { TAB_ICON } from './useTabBarLayout';

export interface TabBarItemProps {
  item: TabItem;
  selected: boolean;
  /** This tab's centre in bar coordinates; null until measured. */
  center: number | null;
  /** The widest the label may be and still sit inside the liquid with its padding (see labelLimits). */
  labelMaxWidth?: number;
  head: SharedValue<number>;
  trail: SharedValue<number>;
  amp: SharedValue<number>;
  spacing: number;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  /** The icon + label block's size: the liquid is sized to wrap it. */
  onContentLayout: (event: LayoutChangeEvent) => void;
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
  labelMaxWidth,
  head,
  trail,
  amp,
  spacing,
  onPress,
  onLayout,
  onContentLayout,
}: TabBarItemProps) {
  const { theme } = useUnistyles();

  const magnified = useAnimatedStyle(() => {
    if (center === null) return { transform: [{ translateY: 0 }, { scale: 1 }] };
    const weight = falloff(distanceToSpan(center, trail.get(), head.get()), spacing, magnify.falloffPower);
    const boost = amp.get() * weight;
    return { transform: [{ translateY: -magnify.liftPt * (boost / magnify.peak) }, { scale: 1 + boost }] };
  });

  // Tab labels grow with the system font only so far (like the platforms' own tab bars), and shrink
  // rather than overflow when a narrow screen leaves less room.
  const label = (weight: 'semibold' | 'medium', color: string) => (
    <Text
      variant="mini"
      weight={weight}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      maxFontSizeMultiplier={1.2}
      style={{ color, maxWidth: labelMaxWidth }}
    >
      {item.label}
    </Text>
  );

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
      {/* Active ↔ inactive cross-fades (colour and weight); the active rendering sizes the content, so
          the liquid's width doesn't change when a tab becomes selected. The icon takes the brand green. */}
      <View style={styles.content} onLayout={onContentLayout}>
        <Animated.View testID={`tab-${item.id}-icon`} style={magnified}>
          <Crossfade
            active={selected}
            on={<Icon name={item.icon} size={TAB_ICON} color={theme.colors.accent} />}
            off={<Icon name={item.icon} size={TAB_ICON} color={theme.colors.text3} />}
          />
        </Animated.View>
        <Crossfade
          active={selected}
          on={label('semibold', theme.colors.accentText)}
          off={label('medium', theme.colors.text3)}
        />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // 58 = content (24 icon + 3 gap + 16 label line) + the liquid's 7pt top and bottom padding, plus a point.
  tab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 3 },
});
