import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { ISODate } from '@/shared/lib/date/isoDate';
import { Button, Card, HeatCell, Pill, PressableScale, SectionLabel, SheetLayout, Text } from '@/shared/ui';

import { CheckInRow } from './CheckInRow';
import { useDayDetailsViewModel, type DayDetailsViewModel } from './useDayDetailsViewModel';

/** Day details: opened from any heatmap day, History's day headers, and Home's today line. */
export function DayDetailsSheet({ date }: { date: ISODate | null }) {
  const vm = useDayDetailsViewModel(date);

  return (
    <SheetLayout eyebrow={vm.eyebrow} title={vm.title} onClose={vm.onClose} testID="day-sheet">
      <View style={styles.summary} accessible accessibilityLabel={`${vm.count} check-ins, ${vm.levelLabel}`}>
        <HeatCell level={vm.level} size={52} radius={14} />
        <View style={styles.summaryText}>
          <View style={styles.countRow}>
            <Text variant="numeric" testID="day-count">
              {vm.count}
            </Text>
            <Text variant="footnote" tone="secondary">
              check-in{vm.count === 1 ? '' : 's'}
            </Text>
          </View>
          <Pill label={vm.levelLabel} tone={vm.level > 0 ? 'accent' : 'default'} />
        </View>
      </View>

      <WeekStrip vm={vm} />

      <View style={styles.timeline}>
        <SectionLabel>Timeline</SectionLabel>
        {vm.checkIns.length ? (
          <Card tight>
            {vm.checkIns.map((checkIn, i) => (
              <CheckInRow
                key={checkIn.id}
                checkIn={checkIn}
                layout="timeline"
                onOptions={vm.onOptions}
                divider={i < vm.checkIns.length - 1}
              />
            ))}
          </Card>
        ) : (
          <View style={styles.empty}>
            <Text variant="sub" weight="medium" align="center">
              No check-ins on this day
            </Text>
            <Text variant="footnote" tone="secondary" align="center">
              Forgot to log something? You can add it now.
            </Text>
          </View>
        )}
      </View>

      <Button
        label="Add check-in to this day"
        icon="plus"
        variant="secondary"
        onPress={vm.onAdd}
        testID="day-add"
      />
    </SheetLayout>
  );
}

function WeekStrip({ vm }: { vm: DayDetailsViewModel }) {
  return (
    <View style={styles.strip} accessibilityRole="tablist" accessibilityLabel="This week">
      {vm.strip.map((item) => (
        <PressableScale
          key={item.day}
          onPress={() => vm.onSelectDay(item.day)}
          disabled={item.future}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: item.selected, disabled: item.future }}
          style={styles.stripDay}
          testID={`strip-${item.day}`}
        >
          <Text variant="mini" tone="tertiary">
            {item.letter}
          </Text>
          <HeatCell
            level={item.level}
            size={30}
            radius={9}
            state={item.future ? 'future' : item.selected ? 'selected' : 'default'}
          />
          <Text
            variant="mini"
            tone={item.selected ? 'primary' : 'tertiary'}
            weight={item.selected ? 'semibold' : undefined}
          >
            {item.date}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryText: { gap: 6 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  strip: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.subtle,
  },
  stripDay: { flex: 1, alignItems: 'center', gap: 5, minHeight: 44 },
  timeline: { gap: 12 },
  empty: { alignItems: 'center', gap: 4, paddingVertical: 18, paddingHorizontal: 8 },
}));
