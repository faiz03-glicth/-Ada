import { memo, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatGrid } from '@/features/heatmap/domain/grid';

import { HeatCell } from './HeatCell';
import { Text } from './Text';

export interface HeatmapMonth {
  key: string;
  /** "Sep"; shown over the month's first week. */
  label: string;
  grid: HeatGrid;
}

export interface HeatmapMonthsProps {
  months: readonly HeatmapMonth[];
  /** Seven row letters, in the person's week order. */
  dayLabels: readonly string[];
  /** Tapping (or activating, with a screen reader) a real day. Future days and blanks don't answer. */
  onDayPress?: (day: string) => void;
  /** Horizontal space around the heatmap on screen (gutters + card padding), to size the cells. */
  inset?: number;
  gap?: number;
  monthGap?: number;
  /** The largest a cell may grow on a wide screen. */
  maxCell?: number;
  /** The day that was just checked in (its cell pulses once). */
  pulseDay?: string | null;
}

const LABEL_WIDTH = 10;
const LABEL_GAP = 8;
const MONTH_LABEL = 14;
const MONTH_LABEL_GAP = 6;

/**
 * Months side by side, weeks as columns (the prototype's monthsHM): Home's last three months and each
 * quarter of the year view. Cells are sized to fill the width they're given, so a quarter always fits
 * without scrolling sideways.
 *
 * Built for many cells: each day is a plain view (no per-cell touch handler); one tap handler per month
 * works out which day was touched from where. Each real day is still its own button for screen readers
 * ("Sep 24: 3 check-ins"). Cells are memoised, so a new check-in re-renders only the day it changed.
 */
export const HeatmapMonths = memo(function HeatmapMonths({
  months,
  dayLabels,
  onDayPress,
  inset = 64,
  gap = 3,
  monthGap = 8,
  maxCell = 16,
  pulseDay,
}: HeatmapMonthsProps) {
  const { width } = useWindowDimensions();
  const columns = months.reduce((sum, month) => sum + month.grid.columns.length, 0);
  const free =
    width -
    inset -
    LABEL_WIDTH -
    LABEL_GAP -
    monthGap * (months.length - 1) -
    gap * (columns - months.length);
  const cell = Math.max(8, Math.min(maxCell, Math.floor(free / Math.max(1, columns))));
  const radius = Math.max(2, Math.round(cell / 3.5));

  return (
    <View style={styles.row(monthGap)}>
      <View style={styles.dayLabels(gap)} accessible={false} importantForAccessibility="no-hide-descendants">
        {dayLabels.map((letter, row) => (
          <Text key={row} variant="mini" tone="tertiary" style={styles.dayLabel(cell)}>
            {cell >= 12 || row % 2 === 0 ? letter : ''}
          </Text>
        ))}
      </View>
      {months.map((month) => (
        <MonthGrid
          key={month.key}
          month={month}
          cell={cell}
          gap={gap}
          radius={radius}
          onDayPress={onDayPress}
          pulseDay={pulseDay}
        />
      ))}
    </View>
  );
});

interface MonthGridProps {
  month: HeatmapMonth;
  cell: number;
  gap: number;
  radius: number;
  onDayPress?: (day: string) => void;
  pulseDay?: string | null;
}

const MonthGrid = memo(function MonthGrid({
  month,
  cell,
  gap,
  radius,
  onDayPress,
  pulseDay,
}: MonthGridProps) {
  const { columns } = month.grid;
  const tap = useMemo(() => {
    const pitch = cell + gap;
    return Gesture.Tap()
      .enabled(onDayPress !== undefined)
      .runOnJS(true)
      .onEnd((event, success) => {
        if (!success || !onDayPress) return;
        const day = columns[Math.floor(event.x / pitch)]?.[Math.floor(event.y / pitch)];
        if (day?.label) onDayPress(day.key);
      });
  }, [cell, gap, columns, onDayPress]);

  return (
    <View style={styles.month}>
      <Text variant="mini" tone="tertiary" style={styles.monthLabel} accessible={false}>
        {month.label}
      </Text>
      <GestureDetector gesture={tap}>
        <View style={styles.row(gap)} accessibilityLabel={month.label}>
          {columns.map((column, columnIndex) => (
            <View key={columnIndex} style={styles.column(gap)}>
              {column.map((day) => (
                <HeatCell
                  key={day.key === pulseDay ? `${day.key}-pulse` : day.key}
                  level={day.level}
                  state={day.state}
                  size={cell}
                  radius={radius}
                  pulse={day.key === pulseDay}
                  accessibilityLabel={day.label}
                  dayKey={day.label ? day.key : undefined}
                  onActivate={day.label ? onDayPress : undefined}
                />
              ))}
            </View>
          ))}
        </View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  row: (gap: number) => ({ flexDirection: 'row' as const, gap }),
  column: (gap: number) => ({ gap }),
  month: { gap: MONTH_LABEL_GAP },
  monthLabel: { height: MONTH_LABEL, lineHeight: MONTH_LABEL },
  dayLabels: (gap: number) => ({
    width: LABEL_WIDTH,
    gap,
    paddingTop: MONTH_LABEL + MONTH_LABEL_GAP,
  }),
  dayLabel: (size: number) => ({ height: size, lineHeight: size, fontSize: Math.min(10, size - 1) }),
});
