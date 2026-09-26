import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { CheckInRow } from '@/features/checkins/ui/CheckInRow';
import { checkInCount } from '@/shared/lib/format/dates';
import {
  Avatar,
  BarChart,
  Button,
  Card,
  HeatmapMonths,
  Icon,
  IconButton,
  Legend,
  Pill,
  PressableScale,
  Screen,
  ScreenTransition,
  SegmentedControl,
  StatTile,
  Text,
} from '@/shared/ui';

import { useHomeViewModel, type HomeViewModel } from './useHomeViewModel';

/** Home: the heatmap is the anchor; everything under it supports it. */
export function HomeScreen() {
  const vm = useHomeViewModel();
  const { theme } = useUnistyles();

  return (
    <Screen scroll withTabBar testID="home-screen">
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text variant="caption" tone="secondary">
            {vm.dateLine}
          </Text>
          <Text variant="title" accessibilityRole="header">
            Your activity
          </Text>
        </View>
        <PressableScale
          onPress={vm.onProfile}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          hitSlop={4}
        >
          <Avatar name={vm.avatarName} uri={vm.avatarUrl} size={40} />
        </PressableScale>
      </View>

      <HeatmapCard vm={vm} />

      <View style={styles.stats}>
        <StatTile
          testID="home-streak"
          icon={{ name: 'flame', color: theme.activity.orange }}
          value={vm.streak}
          label="Day streak"
        />
        <StatTile
          testID="home-active-days"
          icon={{ name: 'calendar', color: theme.colors.accentText }}
          value={vm.activeDays}
          suffix={`/${vm.periodDays}`}
          label="Active days"
        />
        <StatTile
          testID="home-this-week"
          icon={{ name: 'check', color: theme.activity.blue }}
          value={vm.thisWeek}
          label="This week"
        />
      </View>

      <TrendCard vm={vm} />

      <View style={styles.sectionHeader}>
        <Text variant="title3" accessibilityRole="header">
          Today
        </Text>
        <Button label="See all" variant="ghost" size="sm" onPress={vm.onSeeAll} />
      </View>
      <Card tight>
        {vm.todayList.length ? (
          vm.todayList.map((checkIn, i) => (
            <CheckInRow
              key={checkIn.id}
              checkIn={checkIn}
              layout="summary"
              onPress={vm.onToday}
              divider={i < vm.todayList.length - 1}
            />
          ))
        ) : (
          <Text variant="footnote" tone="secondary" style={styles.nothingToday}>
            Nothing logged yet today. Tap + to add your first check-in.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

function HeatmapCard({ vm }: { vm: HomeViewModel }) {
  const { theme } = useUnistyles();
  return (
    <Card style={styles.heatmapCard}>
      <View style={styles.between}>
        <Pressable
          onPress={vm.onOpenCalendar}
          accessibilityRole="button"
          accessibilityLabel={`${vm.periodYear}, ${vm.periodRange}, ${checkInCount(vm.periodTotal)}`}
          accessibilityHint="Opens the full heatmap"
          style={styles.grow}
        >
          <View style={styles.titleRow}>
            <Text variant="title3">{vm.periodYear}</Text>
            <Icon name="chevron-down" size={18} color={theme.colors.text} />
          </View>
          <Text variant="footnote" tone="secondary">
            {vm.periodRange} · {vm.empty ? 'No check-ins' : checkInCount(vm.periodTotal)}
          </Text>
        </Pressable>
        <View style={styles.arrows}>
          <IconButton icon="chevron-left" onPress={vm.onOlder} accessibilityLabel="Previous months" />
          <IconButton
            icon="chevron-right"
            onPress={vm.onNewer}
            disabled={!vm.canGoNewer}
            accessibilityLabel="Next months"
          />
        </View>
      </View>

      <ScreenTransition index={-vm.monthsBack}>
        <HeatmapMonths
          months={vm.heatmap}
          dayLabels={vm.dayLabels}
          onMonthPress={vm.onMonthPress}
          pulseDay={vm.pulseDay}
        />
      </ScreenTransition>

      {vm.empty ? (
        <View style={styles.emptyHeatmap}>
          <Text variant="headline" align="center">
            Your heatmap starts today
          </Text>
          <Text variant="footnote" tone="secondary" align="center">
            Every check-in fills in a day. Log a few and watch it get darker.
          </Text>
          <View style={styles.emptyAction}>
            <Button label="Log your first check-in" icon="plus" size="sm" onPress={vm.onFirstCheckIn} />
          </View>
        </View>
      ) : (
        <View style={styles.between}>
          <Pressable
            onPress={vm.onToday}
            accessibilityRole="button"
            accessibilityLabel={`Today, ${checkInCount(vm.todayCount)}`}
            style={styles.todayLink}
            hitSlop={8}
          >
            <View style={styles.dot} />
            <Text variant="caption" tone="secondary">
              Today · {checkInCount(vm.todayCount)}
            </Text>
          </Pressable>
          {vm.showLegend && <Legend />}
        </View>
      )}
    </Card>
  );
}

function TrendCard({ vm }: { vm: HomeViewModel }) {
  const { trend } = vm;
  const up = trend.deltaPercent >= 0;
  return (
    <Card style={styles.trendCard}>
      <View style={styles.between}>
        <Text variant="headline" accessibilityRole="header">
          Check-ins per {trend.unit}
        </Text>
        <View style={styles.trendControl}>
          <SegmentedControl
            options={vm.trendOptions}
            value={vm.trendRange}
            onChange={vm.onTrendRange}
            accessibilityLabel="Trend range: day, week or month"
            testID="home-trend"
          />
        </View>
      </View>
      {!vm.trendReady ? (
        <View style={styles.trendEmpty}>
          <Text variant="sub" weight="medium" align="center">
            Your trend appears after a week
          </Text>
          <Text variant="footnote" tone="secondary" align="center">
            We&apos;ll chart how your check-ins change over time.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.trendSummary}>
            <Text variant="numeric">{trend.average}</Text>
            <View style={styles.trendMeta}>
              <Text variant="footnote" tone="secondary">
                avg / {trend.unit}
              </Text>
              {trend.average > 0 && (
                <Pill
                  tone={up ? 'accent' : 'default'}
                  icon={up ? 'trending-up' : 'trending-down'}
                  label={`${up ? '+' : ''}${trend.deltaPercent}% this ${trend.unit}`}
                />
              )}
            </View>
          </View>
          <BarChart
            values={trend.values}
            average={trend.average}
            highlight="last"
            labels={vm.trendRange === 'W' ? ['12 weeks ago', 'This week'] : trend.labels}
            labelMode={vm.trendRange === 'W' ? 'spread' : 'each'}
            accessibilityLabel={`Check-ins per ${trend.unit}: ${trend.values.at(-1) ?? 0} this ${trend.unit}, average ${trend.average}`}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingTop: 6 },
  grow: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrows: { flexDirection: 'row', gap: theme.spacing.sm },
  heatmapCard: { gap: 14 },
  todayLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  emptyHeatmap: { alignItems: 'center', gap: 6, paddingTop: 4, paddingBottom: 2 },
  emptyAction: { marginTop: 6 },
  stats: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  trendCard: { gap: 14 },
  trendControl: { width: 132 },
  trendEmpty: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 14,
    backgroundColor: theme.colors.subtle,
  },
  trendSummary: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  trendMeta: { gap: 3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs,
    paddingHorizontal: 2,
  },
  nothingToday: { paddingVertical: theme.spacing.md },
}));
