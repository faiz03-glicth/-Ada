import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { DayPickerOptions } from '@/shared/actions';
import { Button, DateWheel, Pill, SheetLayout, Text } from '@/shared/ui';

import { useDayPickerViewModel } from './useDayPickerViewModel';

/**
 * Pick a day in a month: opened by choosing a month on a heatmap. The wheel does the choosing (drag, or
 * tap a date to bring it to the centre); the chosen day's summary follows it, and Open (or tapping the
 * centred date) continues to Day details.
 */
export function DayPickerSheet({ options }: { options: DayPickerOptions | null }) {
  const vm = useDayPickerViewModel(options);

  return (
    <SheetLayout eyebrow="Pick a day" title={vm.title} onClose={vm.onClose} testID="day-picker">
      {vm.ready ? (
        <DateWheel
          days={vm.days}
          focusedIndex={vm.focusedIndex}
          onFocusChange={vm.onFocusChange}
          onConfirm={vm.onOpen}
          accessibilityLabel={vm.wheelLabel}
          testID="day-wheel"
        />
      ) : (
        <View style={styles.wheelSpace} />
      )}
      <View style={styles.summary} testID="day-picker-summary">
        <View style={styles.grow}>
          <Text variant="caption" tone="secondary">
            {vm.dayEyebrow}
          </Text>
          <Text variant="headline">{vm.dayTitle}</Text>
        </View>
        <View style={styles.count}>
          <Text variant="numeric2">{vm.count}</Text>
          <Pill label={vm.levelLabel} tone={vm.level > 0 ? 'accent' : 'default'} />
        </View>
      </View>
      <Button label={vm.openLabel} onPress={vm.onOpen} testID="day-picker-open" />
      <Text variant="mini" tone="tertiary" align="center">
        Drag the dates, or tap one to bring it to the centre.
      </Text>
    </SheetLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  grow: { flex: 1, gap: 2 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.subtle,
  },
  count: { alignItems: 'flex-end', gap: 4 },
  // The wheel's height, held while the check-ins load (a moment), so nothing below it jumps.
  wheelSpace: { height: 128 },
}));
