import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { INTENSITY_LEVELS } from '@/features/heatmap/domain/intensity';

import { Card } from './Card';
import { HeatCell } from './HeatCell';
import { Text } from './Text';

export interface IntensityGuideProps {
  layout?: 'list' | 'row';
  cellSize?: number;
}

/** Explains the five intensity levels. Shared by onboarding, the heatmap screen and activity preferences. */
export function IntensityGuide({ layout = 'list', cellSize = 30 }: IntensityGuideProps) {
  const radius = Math.round(cellSize * 0.3);

  if (layout === 'row') {
    return (
      <View style={styles.row}>
        {INTENSITY_LEVELS.map((info) => (
          <View
            key={info.level}
            style={styles.rowItem}
            accessible
            accessibilityLabel={`${info.name}: ${info.rangeLabel}`}
          >
            <HeatCell level={info.level} size={cellSize} radius={radius} />
            <Text variant="caption" align="center" numberOfLines={1}>
              {info.name}
            </Text>
            <Text variant="mini" tone="tertiary" align="center" numberOfLines={1}>
              {info.rangeLabel}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Card tight divided>
      {INTENSITY_LEVELS.map((info) => (
        <View
          key={info.level}
          style={styles.listItem}
          accessible
          accessibilityLabel={`${info.name}: ${info.rangeLabel}`}
        >
          <HeatCell level={info.level} size={cellSize} radius={radius} />
          <View style={styles.listText}>
            <Text variant="sub" weight="semibold">
              {info.name}
            </Text>
            <Text variant="footnote" tone="secondary">
              {info.rangeLabel}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  rowItem: { flex: 1, alignItems: 'center', gap: theme.spacing.xs },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  listText: { flex: 1 },
}));
