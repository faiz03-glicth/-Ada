import { memo, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Easing, ReduceMotion, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';
import { motion } from '@/theme';

import { HeatCell, type HeatAppear } from './HeatCell';
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
  /** Staggered grow-in: col × 40ms + row × 15ms. Skipped with Reduce Motion. */
  animateIn?: boolean;
}

const { columnMs, rowMs, durationMs } = motion.heroStagger;

/**
 * Weeks-mode heatmap (columns of up to 7 days). Months mode and month labels arrive with Phase 2.
 * The entrance runs on ONE timing animation (a shared clock) instead of one per cell.
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
  const reducedMotion = useReducedMotion();
  const animate = animateIn && !reducedMotion;
  const clock = useSharedValue(0);
  const lastRow = Math.max(0, ...grid.columns.map((column) => column.length - 1));
  const totalMs = Math.max(0, grid.columns.length - 1) * columnMs + lastRow * rowMs + durationMs;

  useEffect(() => {
    if (!animate) return;
    clock.set(0);
    clock.set(
      withTiming(totalMs, { duration: totalMs, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
    );
  }, [animate, totalMs, clock]);

  const appearances = useMemo<HeatAppear[][] | null>(
    () =>
      animate
        ? grid.columns.map((column, c) =>
            column.map((_, r) => ({ clock, delayMs: c * columnMs + r * rowMs })),
          )
        : null,
    [animate, grid, clock],
  );

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
              appear={appearances?.[columnIndex]?.[rowIndex]}
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
