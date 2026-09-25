import { memo, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';
import { heatRevealRules, useMotion } from '@/theme';

import { HeatCell } from './HeatCell';
import { heroCellDelay } from './heroStagger';
import { Text } from './Text';

export interface HeatmapProps {
  /** Columns (weeks) of day cells, built by the heatmap domain. */
  grid: HeatGrid;
  cellSize?: number;
  gap?: number;
  radius?: number;
  /** Cells become buttons that report their key (ISO date). */
  interactive?: boolean;
  onDayPress?: (key: string) => void;
  /** Seven pre-formatted row labels (e.g. M, '', W, …). */
  dayLabels?: readonly string[];
  /** The motion system's heatmap reveal, timed by heroCellDelay. Skipped with Reduce Motion. */
  animateIn?: boolean;
}

/**
 * Weeks-mode heatmap (columns of up to 7 days). Months mode and month labels arrive with Phase 2.
 * The reveal is a native CSS animation per cell (no per-cell hooks), resolved once here.
 * Non-interactive heatmaps are decorative and hidden from screen readers.
 */
export const Heatmap = memo(function Heatmap({
  grid,
  cellSize = 14,
  gap = 4,
  radius,
  interactive = false,
  onDayPress,
  dayLabels,
  animateIn = false,
}: HeatmapProps) {
  const { theme } = useUnistyles();
  const motionSystem = useMotion();
  // The reveal's colours are taken once, at mount: a theme change mid-reveal must not restart it
  // (the cells' own colours still follow the theme natively).
  const [rules] = useState(() => (animateIn ? heatRevealRules(theme.heat) : null));
  const decorative = !interactive;

  return (
    <View
      style={styles.row(gap)}
      accessible={false}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={decorative}
    >
      {dayLabels && (
        <View style={styles.column(gap)}>
          {dayLabels.map((label, row) => (
            <Text key={row} variant="mini" tone="tertiary" style={styles.dayLabel(cellSize)}>
              {label}
            </Text>
          ))}
        </View>
      )}
      {grid.columns.map((column, columnIndex) => (
        <View key={columnIndex} style={styles.column(gap)}>
          {column.map((cell, rowIndex) => (
            <HeatCell
              key={cell.key}
              level={cell.level}
              state={cell.state}
              size={cellSize}
              radius={radius}
              appear={
                rules && motionSystem.heatReveal(rules, cell.level, heroCellDelay(columnIndex, rowIndex))
              }
              onPress={interactive && onDayPress ? () => onDayPress(cell.key) : undefined}
              accessibilityLabel={cell.label}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: (gap: number) => ({ flexDirection: 'row' as const, gap }),
  column: (gap: number) => ({ gap }),
  dayLabel: (size: number) => ({ height: size, lineHeight: size, fontSize: Math.min(10, size - 1) }),
});
