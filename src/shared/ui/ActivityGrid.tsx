import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { Activity } from '@/features/activities/domain/Activity';
import { useMotion, useStateTransition } from '@/theme';

import { ActivityBadge } from './ActivityBadge';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ActivityGridProps {
  activities: readonly Activity[];
  selectedIds: readonly string[];
  selection: 'single' | 'multi';
  onToggle: (id: string) => void;
  /** Adds a dashed "New" tile at the end. */
  showAdd?: boolean;
  onAddPress?: () => void;
}

type Tile = { kind: 'activity'; activity: Activity } | { kind: 'add' } | { kind: 'spacer'; key: string };
const COLUMNS = 3;

function toRows(tiles: Tile[]): Tile[][] {
  const rows: Tile[][] = [];
  for (let i = 0; i < tiles.length; i += COLUMNS) rows.push(tiles.slice(i, i + COLUMNS));
  const last = rows.at(-1);
  while (last && last.length < COLUMNS) last.push({ kind: 'spacer', key: `spacer-${last.length}` });
  return rows;
}

/** Shared by the check-in sheet (single) and onboarding setup (multi). */
export function ActivityGrid({
  activities,
  selectedIds,
  selection,
  onToggle,
  showAdd = false,
  onAddPress,
}: ActivityGridProps) {
  const { theme } = useUnistyles();
  const select = useStateTransition(['backgroundColor', 'borderColor'], 'normal');
  const motion = useMotion();
  // The tile the person last tapped: only it swells, so pre-selected tiles stay still when the grid appears.
  const [tapped, setTapped] = useState<string | null>(null);
  const tiles: Tile[] = [
    ...activities.map((activity): Tile => ({ kind: 'activity', activity })),
    ...(showAdd && onAddPress ? [{ kind: 'add' } as const] : []),
  ];

  return (
    <View style={styles.grid} accessibilityRole={selection === 'single' ? 'radiogroup' : undefined}>
      {toRows(tiles).map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((tile) => {
            if (tile.kind === 'spacer') return <View key={tile.key} style={styles.spacer} />;
            if (tile.kind === 'add') {
              return (
                <PressableScale
                  key="add"
                  onPress={onAddPress}
                  accessibilityRole="button"
                  accessibilityLabel="New activity"
                  style={styles.addTile}
                >
                  <Icon name="plus" size={22} color={theme.colors.text2} />
                  <Text variant="footnote" weight="medium" tone="secondary">
                    New
                  </Text>
                </PressableScale>
              );
            }
            const { activity } = tile;
            const selected = selectedIds.includes(activity.id);
            return (
              <PressableScale
                key={activity.id}
                testID={`activity-${activity.id}`}
                onPress={() => {
                  setTapped(activity.id);
                  onToggle(activity.id);
                }}
                accessibilityRole={selection === 'multi' ? 'checkbox' : 'radio'}
                accessibilityLabel={activity.name}
                accessibilityState={selection === 'multi' ? { checked: selected } : { selected }}
                style={[
                  styles.tile,
                  {
                    borderColor: selected ? theme.activity[activity.color] : theme.colors.subtle,
                    backgroundColor: selected
                      ? (theme.glass?.strong ?? theme.colors.surface)
                      : theme.colors.subtle,
                  },
                  select,
                ]}
              >
                <Animated.View style={motion.selection(selected && tapped === activity.id)}>
                  <ActivityBadge activity={activity} size={38} />
                </Animated.View>
                <Text variant="footnote" weight="medium" numberOfLines={1}>
                  {activity.name}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  grid: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  spacer: { flex: 1 },
  // Colours are set inline so selection can ease between them (useStateTransition).
  tile: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  addTile: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border2,
  },
}));
