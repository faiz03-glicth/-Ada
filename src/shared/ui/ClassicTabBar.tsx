import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '../lib/haptics';
import type { TabId, TabItem } from '../config/tabs';
import { Crossfade } from './Crossfade';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { FAB_SIZE, TabBarFab } from './TabBarFab';
import { Text } from './Text';
import { TAB_ICON } from './useTabBarLayout';

export interface ClassicTabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  onFabPress: () => void;
  onFabLongPress?: () => void;
}

/**
 * The Classic footer: a plain bar docked to the bottom edge on a solid surface with a hairline top border,
 * like the platforms' own tab bars. No glass (no blur, no translucency, no lit edge) and no liquid (no
 * moving highlight, no stretch, no magnification): the selected tab is its colour and weight, easing
 * between tabs. A soft haptic only when the tab actually changes.
 */
export function ClassicTabBar({ items, active, onTabPress, onFabPress, onFabLongPress }: ClassicTabBarProps) {
  const half = Math.ceil(items.length / 2);
  const press = (id: TabId) => {
    if (id !== active) haptics.soft();
    onTabPress(id);
  };
  const tab = (item: TabItem) => (
    <ClassicTab key={item.id} item={item} selected={item.id === active} onPress={() => press(item.id)} />
  );

  return (
    <View style={styles.bar} accessibilityRole="tablist" testID="tab-bar-classic">
      {items.slice(0, half).map(tab)}
      <View style={styles.fabSlot}>
        <TabBarFab onPress={onFabPress} onLongPress={onFabLongPress} />
      </View>
      {items.slice(half).map(tab)}
    </View>
  );
}

function ClassicTab({ item, selected, onPress }: { item: TabItem; selected: boolean; onPress: () => void }) {
  const { theme } = useUnistyles();
  const label = (weight: 'semibold' | 'medium', color: string) => (
    <Text variant="mini" weight={weight} numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ color }}>
      {item.label}
    </Text>
  );
  return (
    <PressableScale
      testID={`tab-${item.id}`}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected }}
      style={styles.tab}
    >
      <Crossfade
        active={selected}
        on={<Icon name={item.icon} size={TAB_ICON} color={theme.colors.accent} />}
        off={<Icon name={item.icon} size={TAB_ICON} color={theme.colors.text3} />}
      />
      <Crossfade
        active={selected}
        on={label('semibold', theme.colors.accentText)}
        off={label('medium', theme.colors.text3)}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: Math.max(rt.insets.bottom, theme.spacing.sm),
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  tab: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3 },
  fabSlot: { width: FAB_SIZE + 16, alignItems: 'center' },
}));
