import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  Avatar,
  Card,
  HeatmapWeeks,
  IconButton,
  Legend,
  ListRow,
  Screen,
  SectionLabel,
  StatTile,
  Text,
} from '@/shared/ui';

import { useProfileViewModel } from './useProfileViewModel';

/** Profile: identity, totals, the last 20 weeks, and every setting, grouped. */
export function ProfileScreen() {
  const vm = useProfileViewModel();

  return (
    <Screen scroll withTabBar testID="profile-screen">
      <Text variant="title" style={styles.title}>
        Profile
      </Text>

      <Card style={styles.identity}>
        <Avatar name={vm.avatarName} uri={vm.avatarUrl} size={60} />
        <View style={styles.grow}>
          <Text variant="headline" accessibilityRole="header" numberOfLines={1}>
            {vm.name}
          </Text>
          {vm.detail ? (
            <Text variant="footnote" tone="secondary" numberOfLines={2}>
              {vm.detail}
            </Text>
          ) : null}
          {vm.memberSince ? (
            <Text variant="mini" tone="tertiary">
              {vm.memberSince}
            </Text>
          ) : null}
        </View>
        <IconButton icon="pencil" onPress={vm.onAccount} accessibilityLabel="Edit profile" />
      </Card>

      <View style={styles.stats}>
        <StatTile label="Check-ins" value={vm.totals.checkIns} testID="profile-check-ins" />
        <StatTile label="Best streak" value={vm.totals.bestStreak} />
        <StatTile label="Active days" value={vm.totals.activeDays} />
      </View>

      <Card style={styles.weeks}>
        <View style={styles.between}>
          <Text variant="headline" accessibilityRole="header">
            Last 20 weeks
          </Text>
          <Legend />
        </View>
        <HeatmapWeeks
          grid={vm.weeks.grid}
          monthLabels={vm.weeks.monthLabels}
          dayLabels={vm.dayLabels}
          accessibilityLabel={vm.weeksLabel}
        />
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Card tight>
        <ListRow
          title="Account settings"
          icon="user"
          iconColor="blue"
          trailing="chevron"
          onPress={vm.onAccount}
          testID="profile-account"
        />
      </Card>

      <SectionLabel>Preferences</SectionLabel>
      <Card tight divided>
        <ListRow
          title="Appearance"
          icon="contrast"
          iconColor="purple"
          value={vm.themeValue}
          trailing="chevron"
          onPress={vm.onAppearance}
          testID="profile-appearance"
        />
        <ListRow
          title="Notifications"
          icon="bell"
          iconColor="orange"
          value={vm.notificationsValue}
          trailing="chevron"
          onPress={vm.onNotifications}
          testID="profile-notifications"
        />
        <ListRow
          title="Activity preferences"
          icon="target"
          value={vm.activitiesValue}
          trailing="chevron"
          onPress={vm.onActivities}
          testID="profile-activities"
        />
      </Card>

      <SectionLabel>Data</SectionLabel>
      <Card tight divided>
        <ListRow
          title="Data & privacy"
          icon="shield"
          iconColor="teal"
          trailing="chevron"
          onPress={vm.onPrivacy}
          testID="profile-privacy"
        />
        <ListRow
          title="Export data"
          icon="download"
          iconColor="teal"
          value="CSV, JSON"
          trailing="chevron"
          onPress={vm.onPrivacy}
        />
      </Card>

      <SectionLabel>Support</SectionLabel>
      <Card tight divided>
        <ListRow title="About Streak" icon="info" iconColor="blue" trailing="chevron" onPress={vm.onAbout} />
        <ListRow
          title="Help & feedback"
          icon="help"
          iconColor="green"
          trailing="chevron"
          onPress={vm.onHelp}
        />
      </Card>

      <Card tight>
        <ListRow title="Log out" danger centered onPress={vm.onLogOut} testID="profile-log-out" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  title: { paddingTop: 6 },
  grow: { flex: 1, gap: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stats: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  weeks: { gap: 10 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
}));
