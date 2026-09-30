import { memo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import type { Activity } from '@/features/activities/domain/Activity';
import type { CheckIn } from '@/features/checkins/domain/CheckIn';
import { CheckInRow } from '@/features/checkins/ui/CheckInRow';
import type { ISODate } from '@/shared/lib/date/isoDate';
import {
  ActivityGrid,
  Banner,
  Button,
  Card,
  DateWheel,
  HeatCell,
  Pill,
  SectionLabel,
  SheetLayout,
  Text,
} from '@/shared/ui';
import { useDayChangeMotion, type HeatLevel } from '@/theme';

import { useDaySheetViewModel } from './useDaySheetViewModel';

/**
 * The Day sheet, the one way into a day (a heatmap month, a Calendar day, a History day header, Home's
 * today line): the wheel chooses the day, and under it sit that day's summary, Check in and timeline.
 * Three memoised parts, so moving the wheel re-renders only what shows the day.
 */
export function DaySheet({ date }: { date: ISODate | null }) {
  const vm = useDaySheetViewModel(date);

  return (
    <SheetLayout title={vm.title} onClose={vm.onClose} testID="day-sheet">
      <DateWheel
        days={vm.days}
        focusedIndex={vm.focusedIndex}
        onFocusChange={vm.onFocusChange}
        accessibilityLabel={vm.wheelLabel}
        testID="day-wheel"
      />
      <DaySummary
        day={vm.day}
        title={vm.dayTitle}
        relative={vm.relative}
        count={vm.count}
        level={vm.level}
        levelLabel={vm.levelLabel}
        summaryLabel={vm.summaryLabel}
      />
      <LogControls
        activities={vm.activities}
        activityId={vm.activityId}
        saving={vm.saving}
        error={vm.error}
        moreLabel={vm.moreLabel}
        onPickActivity={vm.onPickActivity}
        onCheckIn={vm.onCheckIn}
        onMore={vm.onMore}
      />
      <DayTimeline day={vm.day} checkIns={vm.checkIns} onOptions={vm.onOptions} />
    </SheetLayout>
  );
}

interface DaySummaryProps {
  day: ISODate;
  title: string;
  relative: string | null;
  count: number;
  level: HeatLevel;
  levelLabel: string;
  summaryLabel: string;
}

const DaySummary = memo(function DaySummary({
  day,
  title,
  relative,
  count,
  level,
  levelLabel,
  summaryLabel,
}: DaySummaryProps) {
  const change = useDayChangeMotion(day);
  return (
    <Animated.View style={[styles.section, change]}>
      <View style={styles.titleRow}>
        <Text variant="headline" accessibilityRole="header" style={styles.grow}>
          {title}
        </Text>
        {relative ? (
          <Text variant="footnote" weight="semibold" tone="accent">
            {relative}
          </Text>
        ) : null}
      </View>
      <View style={styles.summary} accessible accessibilityLabel={summaryLabel}>
        <HeatCell level={level} size={52} radius={14} />
        <View style={styles.summaryText}>
          <View style={styles.countRow}>
            <Text variant="numeric" testID="day-count">
              {count}
            </Text>
            <Text variant="footnote" tone="secondary">
              check-in{count === 1 ? '' : 's'}
            </Text>
          </View>
          <Pill label={levelLabel} tone={level > 0 ? 'accent' : 'default'} />
        </View>
      </View>
    </Animated.View>
  );
});

interface LogControlsProps {
  activities: readonly Activity[];
  activityId: string;
  saving: boolean;
  error: string | null;
  moreLabel: string;
  onPickActivity: (id: string) => void;
  onCheckIn: () => void;
  onMore: () => void;
}

const LogControls = memo(function LogControls({
  activities,
  activityId,
  saving,
  error,
  moreLabel,
  onPickActivity,
  onCheckIn,
  onMore,
}: LogControlsProps) {
  return (
    <View style={styles.section}>
      <Text variant="caption" tone="secondary">
        What did you do?
      </Text>
      <ActivityGrid
        activities={activities}
        selectedIds={[activityId]}
        selection="single"
        onToggle={onPickActivity}
      />
      <Button
        label="Check in"
        icon="check"
        onPress={onCheckIn}
        loading={saving}
        loadingLabel="Saving…"
        testID="day-check-in"
      />
      {error ? <Banner message={error} testID="day-error" /> : null}
      <Button label={moreLabel} variant="ghost" onPress={onMore} testID="day-more" />
    </View>
  );
});

interface DayTimelineProps {
  day: ISODate;
  checkIns: readonly CheckIn[];
  onOptions: (checkIn: CheckIn) => void;
}

const DayTimeline = memo(function DayTimeline({ day, checkIns, onOptions }: DayTimelineProps) {
  const change = useDayChangeMotion(day);
  return (
    <Animated.View style={[styles.timeline, change]}>
      <SectionLabel>Timeline</SectionLabel>
      {checkIns.length ? (
        <Card tight>
          {checkIns.map((checkIn, i) => (
            <CheckInRow
              key={checkIn.id}
              checkIn={checkIn}
              layout="timeline"
              onOptions={onOptions}
              divider={i < checkIns.length - 1}
            />
          ))}
        </Card>
      ) : (
        <Text variant="sub" weight="medium" align="center" style={styles.empty}>
          No check-ins on this day
        </Text>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create((theme) => ({
  section: { gap: 10 },
  grow: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryText: { gap: 6 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  timeline: { gap: 12 },
  empty: { paddingVertical: 18 },
}));
