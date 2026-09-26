import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ISODate } from '@/shared/lib/date/isoDate';
import {
  ActivityGrid,
  Banner,
  Button,
  ChipRow,
  HeatCell,
  Icon,
  IconButton,
  PressableScale,
  SheetLayout,
  Text,
  TextField,
} from '@/shared/ui';

import { useCheckInViewModel, type CheckInViewModel } from './useCheckInViewModel';

/** The New check-in sheet (the + button, "Add check-in to this day", Home's empty state). */
export function CheckInSheet({ date }: { date: ISODate | null }) {
  const vm = useCheckInViewModel(date);
  const { theme } = useUnistyles();

  return (
    <SheetLayout
      keyboard
      title="New check-in"
      subtitle={vm.subtitle}
      onClose={vm.onClose}
      testID="check-in-sheet"
    >
      <View style={styles.section}>
        <Text variant="caption" tone="secondary">
          What did you do?
        </Text>
        <ActivityGrid
          activities={vm.activities}
          selectedIds={[vm.activityId]}
          selection="single"
          onToggle={vm.onPickActivity}
        />
        <PressableScale
          onPress={vm.onNewActivity}
          accessibilityRole="button"
          accessibilityLabel="New activity"
          style={styles.newActivity}
        >
          <Icon name="plus" size={18} color={theme.colors.text2} />
          <Text variant="footnote" weight="medium" tone="secondary">
            New activity
          </Text>
        </PressableScale>
      </View>

      {vm.isToday && <WhenSection vm={vm} />}

      <TextField
        label="Note"
        icon="pencil"
        placeholder="Add a note (optional)"
        onChangeText={vm.onNoteChange}
        maxLength={vm.maxNoteLength}
        returnKeyType="done"
        testID="check-in-note"
      />

      <View style={styles.preview} accessible accessibilityLabel={vm.preview.text} testID="check-in-preview">
        <View style={styles.previewCells}>
          <HeatCell level={vm.preview.currentLevel} size={22} radius={6} />
          <Icon name="chevron-right" size={16} color={theme.colors.text2} />
          <HeatCell level={vm.preview.nextLevel} size={22} radius={6} />
        </View>
        <Text variant="footnote" style={styles.grow}>
          {vm.preview.text}
        </Text>
      </View>

      {vm.error ? <Banner message={vm.error} testID="check-in-error" /> : null}

      <Button
        label="Check in"
        icon="check"
        onPress={vm.onSave}
        loading={vm.saving}
        loadingLabel="Saving…"
        testID="check-in-save"
      />
      <Text variant="mini" tone="tertiary" align="center">
        Tip: hold + on the home screen to repeat your last check-in.
      </Text>
    </SheetLayout>
  );
}

function WhenSection({ vm }: { vm: CheckInViewModel }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" tone="secondary">
        When
      </Text>
      <ChipRow
        options={vm.whenOptions}
        value={vm.when}
        onChange={vm.onWhen}
        accessibilityLabel="When"
        testID="check-in-when"
      />
      {vm.when === 'pick' && (
        <View
          style={styles.stepper}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Time"
          accessibilityValue={{ text: vm.pickedLabel }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) =>
            event.nativeEvent.actionName === 'increment' ? vm.onLater() : vm.onEarlier()
          }
        >
          <IconButton
            icon="minus"
            onPress={vm.onEarlier}
            disabled={!vm.canPickEarlier}
            accessibilityLabel="15 minutes earlier"
          />
          <Text variant="headline" style={styles.pickedTime} testID="check-in-picked-time">
            {vm.pickedLabel}
          </Text>
          <IconButton
            icon="plus"
            onPress={vm.onLater}
            disabled={!vm.canPickLater}
            accessibilityLabel="15 minutes later"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: { gap: 10 },
  grow: { flex: 1 },
  newActivity: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.subtle,
  },
  pickedTime: { fontVariant: ['tabular-nums'] },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.accentSoft,
  },
  previewCells: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
