import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { TabId, TabItem } from '../config/tabs';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface TabBarProps {
  items: readonly TabItem[];
  active: TabId;
  onTabPress: (tab: TabId) => void;
  onFabPress: () => void;
}

/** Floating bottom bar: two tabs, a raised centre "+" (new check-in), two tabs. */
export function TabBar({ items, active, onTabPress, onFabPress }: TabBarProps) {
  const { theme } = useUnistyles();
  const half = Math.ceil(items.length / 2);

  const renderTab = (item: TabItem) => {
    const selected = item.id === active;
    const color = selected ? theme.colors.accentText : theme.colors.text3;
    return (
      <PressableScale
        key={item.id}
        testID={`tab-${item.id}`}
        onPress={() => onTabPress(item.id)}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected }}
        style={styles.tab}
      >
        <Icon name={item.icon} size={24} color={color} />
        <Text variant="mini" weight={selected ? 'semibold' : 'medium'} style={{ color }}>
          {item.label}
        </Text>
      </PressableScale>
    );
  };

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {items.slice(0, half).map(renderTab)}
      <View style={styles.fabSlot}>
        <PressableScale
          testID="fab-check-in"
          onPress={onFabPress}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="New check-in"
          style={styles.fab}
        >
          <Icon name="plus" size={30} strokeWidth={2.4} color={theme.colors.onAccent} />
        </PressableScale>
      </View>
      {items.slice(half).map(renderTab)}
    </View>
  );
}

const FAB = 64;

const styles = StyleSheet.create((theme, rt) => ({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: theme.spacing.sm,
    paddingHorizontal: 10,
    paddingBottom: Math.max(rt.insets.bottom, theme.spacing.sm),
    backgroundColor: theme.glass?.tabBar ?? theme.colors.surface,
    borderTopWidth: theme.glass ? 0 : 1,
    borderTopColor: theme.colors.border,
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
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
