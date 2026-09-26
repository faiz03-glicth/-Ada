import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { HeatGridCell } from '@/features/heatmap/domain/grid';
import type { HeatmapOptions } from '@/shared/actions';
import {
  Card,
  HeatmapMonths,
  IconButton,
  IntensityGuide,
  Legend,
  NavBar,
  PressableScale,
  Screen,
  ScreenTransition,
  SegmentedControl,
  StatTile,
  Text,
} from '@/shared/ui';

import { useCalendarViewModel, type CalendarViewModel } from './useCalendarViewModel';

/** The full heatmap (Home's year title): Year and Month views. */
export function CalendarScreen({ options }: { options: HeatmapOptions }) {
  const vm = useCalendarViewModel(options);

  return (
    <Screen scroll testID="calendar-screen">
      <NavBar title="Heatmap" onBack={vm.onBack} />
      <SegmentedControl
        options={vm.viewOptions}
        value={vm.view}
        onChange={vm.onView}
        accessibilityLabel="Year or month"
        testID="calendar-view"
      />
      <View style={styles.stepper}>
        <IconButton
          icon="chevron-left"
          onPress={vm.onPrevious}
          accessibilityLabel={vm.view === 'year' ? 'Previous year' : 'Previous month'}
        />
        <Text
          variant="title3"
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          testID="calendar-title"
        >
          {vm.title}
        </Text>
        <IconButton
          icon="chevron-right"
          onPress={vm.onNext}
          disabled={!vm.canGoNext}
          accessibilityLabel={vm.view === 'year' ? 'Next year' : 'Next month'}
        />
      </View>
      <ScreenTransition index={vm.position} style={styles.page}>
        {vm.view === 'year' ? <YearView vm={vm} /> : <MonthView vm={vm} />}
      </ScreenTransition>
      <Card style={styles.intensity}>
        <Text variant="headline" accessibilityRole="header">
          How intensity works
        </Text>
        <Text variant="footnote" tone="secondary">
          Each check-in makes the day darker. Log as often as you like.
        </Text>
        <IntensityGuide layout="row" cellSize={28} />
      </Card>
    </Screen>
  );
}

function YearView({ vm }: { vm: CalendarViewModel }) {
  return (
    <>
      <View style={styles.stats}>
        <StatTile label="Check-ins" value={vm.yearStats.total} testID="calendar-year-total" />
        <StatTile label="Active days" value={vm.yearStats.activeDays} />
        <StatTile label="Best month" value={vm.yearStats.bestMonth} />
      </View>
      <Card style={styles.quarters}>
        {vm.quarters.map((quarter, i) => (
          <HeatmapMonths key={i} months={quarter} dayLabels={vm.dayLabels} onMonthPress={vm.onMonthPress} />
        ))}
        <View style={styles.between}>
          <Text variant="mini" tone="tertiary">
            Tap a month to pick a day
          </Text>
          <Legend />
        </View>
      </Card>
    </>
  );
}

function MonthView({ vm }: { vm: CalendarViewModel }) {
  return (
    <>
      <Card>
        <View style={styles.weekdays} accessible={false}>
          {vm.dayLabels.map((letter, i) => (
            <Text key={i} variant="mini" tone="tertiary" align="center" style={styles.flex}>
              {letter}
            </Text>
          ))}
        </View>
        <View style={styles.monthGrid}>
          {vm.monthRows.map((row, r) => (
            <View key={r} style={styles.monthRow}>
              {row.map((cell) => (
                <DayTile key={cell.key} cell={cell} onPress={vm.onDayPress} />
              ))}
            </View>
          ))}
        </View>
      </Card>
      <Card style={styles.monthStats}>
        <StatLine label="Check-ins" value={String(vm.monthStats.total)} />
        <StatLine label="Active days" value={`${vm.monthStats.activeDays} of ${vm.monthStats.days}`} />
        <StatLine label="Busiest day" value={vm.monthStats.busiest} />
      </Card>
    </>
  );
}

function DayTile({ cell, onPress }: { cell: HeatGridCell; onPress: (day: string) => void }) {
  const { theme } = useUnistyles();
  if (cell.state === 'blank') return <View style={styles.flex} />;
  const date = Number(cell.key.slice(8));
  if (cell.state === 'future') {
    return (
      <View style={[styles.tile, styles.future]} accessible={false}>
        <Text variant="sub" tone="tertiary">
          {date}
        </Text>
      </View>
    );
  }
  const ink = theme.heatInk[cell.level];
  return (
    <PressableScale
      onPress={() => onPress(cell.key)}
      accessibilityRole="button"
      accessibilityLabel={cell.label}
      style={[
        styles.tile,
        { backgroundColor: theme.heat[cell.level] },
        cell.state === 'today' && styles.today,
      ]}
      testID={`tile-${cell.key}`}
    >
      <Text variant="sub" weight="medium" style={{ color: ink }}>
        {date}
      </Text>
      {cell.count ? (
        <Text variant="mini" weight="semibold" style={[styles.tileCount, { color: ink }]}>
          {cell.count}
        </Text>
      ) : null}
    </PressableScale>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.between} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <Text variant="sub" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  page: { gap: theme.spacing.stack },
  stats: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  quarters: { gap: 18 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
  weekdays: { flexDirection: 'row', gap: 6, paddingBottom: 6 },
  monthGrid: { gap: 6 },
  monthRow: { flexDirection: 'row', gap: 6 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  future: { borderWidth: 1, borderColor: theme.colors.border },
  today: { outlineWidth: 2, outlineOffset: 2, outlineColor: theme.colors.text },
  tileCount: { fontSize: 10, lineHeight: 11, opacity: 0.85 },
  monthStats: { gap: 10 },
  intensity: { gap: 10 },
}));
