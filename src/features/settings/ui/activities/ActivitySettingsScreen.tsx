import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  ActivityBadge,
  Card,
  IconButton,
  IntensityGuide,
  ListRow,
  NavBar,
  Screen,
  SectionLabel,
  Text,
} from '@/shared/ui';

import { useActivitySettingsViewModel } from './useActivitySettingsViewModel';

/** Activity preferences: the daily goal, the activities (with how often each was logged), and intensity. */
export function ActivitySettingsScreen() {
  const vm = useActivitySettingsViewModel();

  return (
    <Screen scroll testID="settings-activities">
      <NavBar title="Activity preferences" onBack={vm.onBack} />

      <SectionLabel>Daily goal</SectionLabel>
      <Card style={styles.goalCard}>
        <View style={styles.goalRow}>
          <View style={styles.grow}>
            <Text variant="sub" weight="medium">
              Check-ins per day
            </Text>
            <Text variant="caption" tone="tertiary">
              How many check-ins make a full day for you
            </Text>
          </View>
          <View
            style={styles.stepper}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Check-ins per day"
            accessibilityValue={{ min: vm.minGoal, max: vm.maxGoal, now: vm.goal }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) =>
              event.nativeEvent.actionName === 'increment' ? vm.onIncrease() : vm.onDecrease()
            }
          >
            <IconButton
              icon="minus"
              onPress={vm.onDecrease}
              disabled={vm.goal <= vm.minGoal}
              accessibilityLabel="Decrease"
            />
            <Text variant="numeric2" style={styles.goal} testID="daily-goal">
              {vm.goal}
            </Text>
            <IconButton
              icon="plus"
              onPress={vm.onIncrease}
              disabled={vm.goal >= vm.maxGoal}
              accessibilityLabel="Increase"
            />
          </View>
        </View>
        <View style={styles.scale} accessible={false}>
          {vm.goalSteps.map((step) => (
            <View key={step} style={styles.step(step <= vm.goal)} />
          ))}
        </View>
      </Card>

      <SectionLabel>Your activities</SectionLabel>
      <Card tight divided>
        {vm.activities.map(({ activity, count }) => (
          <View
            key={activity.id}
            style={styles.activityRow}
            accessible
            accessibilityLabel={`${activity.name}, ${count} check-ins`}
          >
            <ActivityBadge activity={activity} size={34} />
            <Text variant="sub" weight="medium" style={styles.grow}>
              {activity.name}
            </Text>
            <Text variant="footnote" tone="secondary">
              {count}
            </Text>
          </View>
        ))}
        <ListRow title="Add activity" icon="plus" onPress={vm.onAddActivity} />
      </Card>

      <SectionLabel>Heatmap intensity</SectionLabel>
      <IntensityGuide cellSize={22} />
      <Text variant="mini" tone="tertiary" style={styles.footnote}>
        All activities count toward the same heatmap. Filter by activity in History.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  grow: { flex: 1 },
  goalCard: { gap: 10 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  goal: { minWidth: 20, textAlign: 'center' },
  scale: { flexDirection: 'row', gap: 6 },
  step: (on: boolean) => ({
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: on ? theme.colors.accent : theme.colors.subtle,
  }),
  activityRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: 10,
  },
  footnote: { paddingHorizontal: 6 },
}));
