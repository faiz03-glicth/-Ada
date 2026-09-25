import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { INTENSITY_LEVELS } from '@/features/heatmap/domain/intensity';
import { useMotion } from '@/theme';

import { Card } from './Card';
import { HeatCell } from './HeatCell';
import { Text } from './Text';

export interface IntensityGuideProps {
  layout?: 'list' | 'row';
  cellSize?: number;
  /** List only: the levels build in order, quietest to deepest (the motion system's staggerIn). */
  animateIn?: boolean;
  /** With animateIn: false holds the levels (hidden) until the guide is on screen, e.g. a page not reached yet. */
  revealed?: boolean;
}

/** Explains the five intensity levels. Shared by onboarding, the heatmap screen and activity preferences. */
export function IntensityGuide({
  layout = 'list',
  cellSize = 30,
  animateIn = false,
  revealed = true,
}: IntensityGuideProps) {
  const radius = Math.round(cellSize * 0.3);
  const motion = useMotion();

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
            <HeatCell level={info.level} size={cellSize} radius={radius} outlined={info.level === 0} />
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
      {INTENSITY_LEVELS.map((info, index) => (
        <Animated.View
          key={info.level}
          style={[styles.listItem, animateIn && motion.staggerIn(index, revealed)]}
          accessible
          accessibilityLabel={`${info.name}: ${info.rangeLabel}`}
        >
          <HeatCell level={info.level} size={cellSize} radius={radius} outlined={info.level === 0} />
          <View style={styles.listText}>
            <Text variant="sub" weight="semibold">
              {info.name}
            </Text>
            <Text variant="footnote" tone="secondary">
              {info.rangeLabel}
            </Text>
          </View>
        </Animated.View>
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
