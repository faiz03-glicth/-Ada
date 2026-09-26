import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
  ActivityBadge,
  BarChart,
  Card,
  HeatCell,
  Icon,
  Pill,
  ProgressBar,
  Screen,
  SegmentedControl,
  StackBar,
  StatTile,
  Text,
} from '@/shared/ui';
import type { HeatLevel } from '@/theme';

import { useInsightsViewModel, type InsightsViewModel } from './useInsightsViewModel';

const LEVEL_RANGES = ['0', '1', '2–3', '4–5', '6+'] as const;

/** Insights: what the check-ins say, in plain words, above each chart. */
export function InsightsScreen() {
  const vm = useInsightsViewModel();

  return (
    <Screen scroll withTabBar testID="insights-screen">
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        Insights
      </Text>
      {vm.loading ? null : vm.ready ? <Ready vm={vm} /> : <NotYet vm={vm} />}
    </Screen>
  );
}

function NotYet({ vm }: { vm: InsightsViewModel }) {
  const { theme } = useUnistyles();
  return (
    <Card style={styles.notYet}>
      <View style={styles.illustration} accessible={false}>
        <Icon name="chart" size={28} color={theme.colors.accentText} />
      </View>
      <Text variant="title3" align="center" accessibilityRole="header">
        Not enough data yet
      </Text>
      <Text variant="footnote" tone="secondary" align="center" style={styles.notYetBody}>
        Check in on {vm.daysNeeded} different days and we&apos;ll show your patterns, best days and trends.
      </Text>
      <View
        style={styles.progress}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Progress"
        accessibilityValue={{ min: 0, max: vm.daysNeeded, now: vm.progressDays }}
      >
        <View style={styles.between}>
          <Text variant="caption" tone="secondary">
            Progress
          </Text>
          <Text variant="caption" tone="secondary" testID="insights-progress">
            {vm.progressDays} of {vm.daysNeeded} days
          </Text>
        </View>
        <ProgressBar value={Math.max(0.03, vm.progressDays / vm.daysNeeded)} />
      </View>
    </Card>
  );
}

function Ready({ vm }: { vm: InsightsViewModel }) {
  const { theme } = useUnistyles();
  const { summary } = vm;
  return (
    <>
      <SegmentedControl
        options={vm.rangeOptions}
        value={vm.range}
        onChange={vm.onRange}
        accessibilityLabel="Week, month or year"
        testID="insights-range"
      />
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatTile
            labelFirst
            label="Check-ins"
            value={summary.total}
            testID="insights-total"
            footer={
              <Pill
                tone={vm.deltaUp ? 'accent' : 'default'}
                label={`${vm.deltaUp ? '+' : ''}${summary.deltaPercent}% vs last`}
              />
            }
          />
          <StatTile
            labelFirst
            label="Active days"
            value={summary.activeDays}
            suffix={`/${summary.days}`}
            footer={
              <Text variant="caption" tone="secondary">
                {vm.activePercentOfRange}% of days
              </Text>
            }
          />
        </View>
        <View style={styles.gridRow}>
          <StatTile
            labelFirst
            label="Daily average"
            value={summary.dailyAverage}
            footer={
              <Text variant="caption" tone="secondary">
                check-ins per day
              </Text>
            }
          />
          <StatTile
            labelFirst
            label="Current streak"
            value={vm.streaks.current}
            suffix=" days"
            footer={
              <Text variant="caption" tone="secondary">
                Best: {vm.streaks.best} days
              </Text>
            }
          />
        </View>
      </View>

      <Card style={styles.card}>
        <View style={styles.between}>
          <Text variant="headline" accessibilityRole="header">
            Check-ins {vm.rangeName}
          </Text>
          <Text variant="footnote" tone="secondary">
            {summary.total} total
          </Text>
        </View>
        <BarChart
          values={summary.values}
          height={120}
          highlight="max"
          gap={vm.range === 'month' ? 3 : 7}
          dense={vm.range === 'month'}
          labels={summary.labels}
          labelMode={vm.range === 'month' ? 'spread' : 'each'}
          accessibilityLabel={`Check-ins ${vm.rangeName}: ${summary.total} in total`}
        />
      </Card>

      <Card style={styles.card}>
        <Text variant="headline" accessibilityRole="header">
          Consistency
        </Text>
        <Text variant="footnote" tone="secondary" style={styles.lead}>
          You were active on{' '}
          <Text variant="footnote" weight="semibold">
            {vm.consistency.activePercent}%
          </Text>{' '}
          of the last 90 days.
        </Text>
        <StackBar
          segments={vm.consistency.daysByLevel.map((days, level) => ({
            key: String(level),
            share: days,
            color: theme.heat[level as HeatLevel],
          }))}
        />
        <View style={styles.levels}>
          {vm.consistency.daysByLevel.map((days, level) => (
            <View
              key={level}
              style={styles.level}
              accessible
              accessibilityLabel={`${LEVEL_RANGES[level]} check-ins: ${days} days`}
            >
              <View style={styles.levelKey}>
                <HeatCell level={level as HeatLevel} size={9} radius={2} />
                <Text variant="mini" tone="tertiary">
                  {LEVEL_RANGES[level]}
                </Text>
              </View>
              <Text variant="sub" weight="semibold">
                {days}
                <Text variant="mini" tone="tertiary">
                  {' '}
                  days
                </Text>
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text variant="headline" accessibilityRole="header">
          Your best days
        </Text>
        <Text variant="footnote" tone="secondary" style={styles.lead}>
          <Text variant="footnote" weight="semibold">
            {vm.bestWeekday}
          </Text>{' '}
          is when you check in most.
        </Text>
        <BarChart
          values={vm.weekdays.map((day) => day.value)}
          height={90}
          highlight="max"
          labels={vm.weekdays.map((day) => day.label)}
          accessibilityLabel={`${vm.bestWeekday} is when you check in most`}
        />
      </Card>

      <Card style={styles.card}>
        <Text variant="headline" accessibilityRole="header">
          Time of day
        </Text>
        {vm.timesOfDay.map((time) => (
          <View
            key={time.key}
            style={styles.timeRow}
            accessible
            accessibilityLabel={`${time.name}, ${time.share}%`}
          >
            <View style={styles.between}>
              <Text variant="sub">
                {time.name}{' '}
                <Text variant="mini" tone="tertiary">
                  {time.hours}
                </Text>
              </Text>
              <Text variant="footnote" tone="secondary">
                {time.share}%
              </Text>
            </View>
            <ProgressBar value={time.fill} color={time.top ? theme.colors.accent : theme.heat[2]} />
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text variant="headline" accessibilityRole="header">
          By activity
        </Text>
        <StackBar
          segments={vm.byActivity.map(({ activity, count }) => ({
            key: activity.id,
            share: count,
            color: theme.activity[activity.color],
          }))}
        />
        <View>
          {vm.byActivity.map(({ activity, count, share }) => (
            <View
              key={activity.id}
              style={styles.activityRow}
              accessible
              accessibilityLabel={`${activity.name}: ${count} check-ins, ${share}%`}
            >
              <ActivityBadge activity={activity} size={32} />
              <Text variant="sub" weight="medium" style={styles.grow}>
                {activity.name}
              </Text>
              <Text variant="footnote" tone="secondary" style={styles.tabular}>
                {count} · {share}%
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card tone="accentSoft" style={styles.tip}>
        <Icon name="sparkles" size={20} color={theme.colors.accentText} />
        <Text variant="sub" style={styles.tipText}>
          {vm.tip}
        </Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  title: { paddingTop: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grow: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  notYet: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 20, marginTop: 30 },
  notYetBody: { maxWidth: 260 },
  illustration: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  progress: {
    alignSelf: 'stretch',
    maxWidth: 240,
    width: '100%',
    alignItems: 'stretch',
    gap: 6,
    marginTop: 8,
  },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  card: { gap: 12 },
  lead: { marginTop: -6 },
  levels: { flexDirection: 'row', gap: 4 },
  level: { flex: 1, gap: 2 },
  levelKey: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeRow: { gap: 6 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: 9 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  tipText: { flex: 1, lineHeight: 20 },
}));
