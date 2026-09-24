import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Avatar, Card, ListRow, NavBar, Screen, Text } from '@/shared/ui';

import { useProfileViewModel } from './useProfileViewModel';

/** Phase 1 placeholder Profile tab: identity and Log out. */
export function ProfileScreen() {
  const vm = useProfileViewModel();

  return (
    <Screen scroll withTabBar testID="profile-screen">
      <NavBar title="Profile" />
      <View style={styles.identity}>
        <Avatar name={vm.avatarName} uri={vm.avatarUrl} size={72} />
        <Text variant="title3" align="center" accessibilityRole="header">
          {vm.name}
        </Text>
        {vm.detail ? (
          <Text variant="footnote" tone="secondary" align="center">
            {vm.detail}
          </Text>
        ) : null}
      </View>
      <Card tight>
        <ListRow title="Log out" danger centered onPress={vm.onLogOut} testID="profile-log-out" />
      </Card>
      <Text variant="caption" tone="tertiary" align="center">
        Settings, appearance and your stats arrive in Phase 4.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  identity: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.lg },
}));
