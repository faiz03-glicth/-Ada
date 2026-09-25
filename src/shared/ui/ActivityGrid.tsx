import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { Activity } from '@/features/activities/domain/Activity';

import { ActivityBadge } from './ActivityBadge';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { SelectableTile } from './SelectableTile';
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

/** Shared by the check-in sheet (single) and onboarding setup (multi). Every tile selects the same way. */
export function ActivityGrid({
  activities,
  selectedIds,
  selection,
  onToggle,
  showAdd = false,
  onAddPress,
}: ActivityGridProps) {
  const { theme } = useUnistyles();
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
            return (
              <SelectableTile
                key={activity.id}
                testID={`activity-${activity.id}`}
                label={activity.name}
                icon={<ActivityBadge activity={activity} size={38} />}
                selected={selectedIds.includes(activity.id)}
                accentColor={theme.activity[activity.color]}
                onPress={() => onToggle(activity.id)}
                accessibilityRole={selection === 'multi' ? 'checkbox' : 'radio'}
              />
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
