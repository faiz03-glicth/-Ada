import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Card, Icon, ListRow, NavBar, Pill, Screen, Text } from '@/shared/ui';
import type { IconName } from '@/shared/ui/icons';
import type { ListRowIconColor } from '@/shared/ui/ListRow';

import {
  useNotificationsSettingsViewModel,
  type NotificationSetting,
} from './useNotificationsSettingsViewModel';

interface Row {
  key: NotificationSetting;
  title: string;
  description: string;
  icon: IconName;
  color: ListRowIconColor;
}

const DAILY: Row = {
  key: 'dailyReminder',
  title: 'Daily reminder',
  description: "A gentle nudge if you haven't checked in",
  icon: 'bell',
  color: 'orange',
};
const EXTRAS: readonly Row[] = [
  {
    key: 'streakProtection',
    title: 'Streak protection',
    description: 'At 9 PM, only if today is still empty',
    icon: 'flame',
    color: 'orange',
  },
  {
    key: 'weeklySummary',
    title: 'Weekly summary',
    description: 'Sunday evening recap of your heatmap',
    icon: 'chart',
    color: 'blue',
  },
  {
    key: 'milestones',
    title: 'Milestones',
    description: 'Celebrate streaks of 7, 30 and 100 days',
    icon: 'star',
    color: 'purple',
  },
];
const QUIET: Row = {
  key: 'quietHours',
  title: 'Quiet hours',
  description: 'No notifications 10:00 PM – 7:00 AM',
  icon: 'moon',
  color: 'blue',
};

/**
 * Notifications: which reminders the person wants. The choices are saved, but Streak can't send
 * notifications yet, and the screen says so up front rather than implying anything is scheduled.
 */
export function NotificationsSettingsScreen() {
  const { theme } = useUnistyles();
  const vm = useNotificationsSettingsViewModel();
  const row = (item: Row) => (
    <ListRow
      key={item.key}
      title={item.title}
      description={item.description}
      icon={item.icon}
      iconColor={item.color}
      trailing="toggle"
      toggleValue={vm.values[item.key]}
      onToggle={vm.onToggle(item.key)}
      testID={`notifications-${item.key}`}
    />
  );

  return (
    <Screen scroll testID="settings-notifications">
      <NavBar title="Notifications" onBack={vm.onBack} />
      <View style={styles.notice} accessible>
        <Icon name="info" size={18} color={theme.colors.text2} />
        <Text variant="footnote" tone="secondary" style={styles.grow}>
          Reminders aren&apos;t sent yet. Your choices are saved and will apply once Streak can send
          notifications.
        </Text>
      </View>
      <Card tight divided>
        {row(DAILY)}
        <View style={[styles.timeRow, !vm.values.dailyReminder && styles.dimmed]}>
          <Text variant="footnote" tone="secondary" style={styles.timeLabel}>
            Time
          </Text>
          <Pill label="8:00 PM" />
        </View>
      </Card>
      <Card tight divided>
        {EXTRAS.map(row)}
      </Card>
      <Card tight>{row(QUIET)}</Card>
      <Text variant="mini" tone="tertiary" style={styles.footnote}>
        Streak will never send more than one reminder a day. You can also turn notifications off in your
        phone&apos;s settings.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  grow: { flex: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.subtle,
  },
  timeRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  timeLabel: { flex: 1, paddingLeft: 46 },
  dimmed: { opacity: 0.45 },
  footnote: { paddingHorizontal: 6, lineHeight: 16 },
}));
