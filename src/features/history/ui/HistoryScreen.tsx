import { memo, useCallback } from 'react';
import { FlatList, Pressable, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { CheckInRow } from '@/features/checkins/ui/CheckInRow';
import { intensityLevel } from '@/features/heatmap/domain/intensity';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { checkInCount, dayLabel } from '@/shared/lib/format/dates';
import { Backdrop, Card, ChipRow, EmptyState, HeatCell, Text, TextField } from '@/shared/ui';
import { PressDelay } from '@/shared/ui/pressDelay';
import { motion } from '@/theme';

import type { HistoryGroup } from '../domain/history';
import { useHistoryViewModel } from './useHistoryViewModel';

/** Room under the list for the floating tab bar and the + button. */
const TAB_BAR_CLEARANCE = 120;

/** History: grouped by day; each day's header repeats its heat cell, so the list and heatmap match. */
export function HistoryScreen() {
  const vm = useHistoryViewModel();

  const renderItem = useCallback<ListRenderItem<HistoryGroup>>(
    ({ item }) => <DayGroup group={item} today={vm.today} onDayPress={vm.onDayPress} />,
    [vm.today, vm.onDayPress],
  );

  const header = (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header" style={styles.title}>
        History
      </Text>
      {!vm.empty && (
        <>
          <TextField
            label="Search activities and notes"
            icon="search"
            placeholder="Search activities and notes"
            value={vm.query}
            onChangeText={vm.onQuery}
            autoCorrect={false}
            returnKeyType="search"
            testID="history-search"
          />
          <ChipRow
            scroll
            options={vm.filterOptions}
            value={vm.filter}
            onChange={vm.onFilter}
            accessibilityLabel="Filter by activity"
            testID="history-filter"
          />
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.root} testID="history-screen">
      <Backdrop />
      <PressDelay value={motion.scroll.pressDelayMs}>
        <FlatList
          data={vm.empty ? [] : vm.groups}
          keyExtractor={(group) => group.day}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            vm.loading ? null : vm.empty ? (
              <EmptyState
                icon="clock"
                title="No check-ins yet"
                body="Everything you log shows up here, grouped by day."
                action={{ label: 'Add a check-in', onPress: vm.onAdd }}
              />
            ) : (
              <Text variant="footnote" tone="secondary" align="center" style={styles.noMatch}>
                {vm.noMatchText}
              </Text>
            )
          }
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      </PressDelay>
    </SafeAreaView>
  );
}

interface DayGroupProps {
  group: HistoryGroup;
  today: ISODate;
  onDayPress: (day: ISODate) => void;
}

const DayGroup = memo(function DayGroup({ group, today, onDayPress }: DayGroupProps) {
  const label = dayLabel(group.day, today);
  return (
    <View style={styles.group}>
      <Pressable
        onPress={() => onDayPress(group.day)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${checkInCount(group.count)}`}
        accessibilityHint="Opens the day"
        style={styles.groupHeader}
      >
        <View style={styles.groupTitle}>
          <HeatCell
            level={intensityLevel(group.count)}
            size={14}
            radius={4}
            state={group.day === today ? 'today' : 'default'}
          />
          <Text variant="sub" weight="semibold">
            {label}
          </Text>
        </View>
        <Text variant="footnote" tone="secondary">
          {checkInCount(group.count)}
        </Text>
      </Pressable>
      <Card tight>
        {group.items.map((checkIn, i) => (
          <CheckInRow
            key={checkIn.id}
            checkIn={checkIn}
            layout="history"
            divider={i < group.items.length - 1}
          />
        ))}
      </Card>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.canvas },
  content: {
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: TAB_BAR_CLEARANCE,
    gap: theme.spacing.stack,
  },
  header: { gap: theme.spacing.stack },
  title: { paddingTop: 6 },
  noMatch: { paddingVertical: 40 },
  group: { gap: theme.spacing.sm },
  groupHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  groupTitle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
}));
