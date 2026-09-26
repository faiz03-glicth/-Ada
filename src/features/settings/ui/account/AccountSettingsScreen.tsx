import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Avatar, Card, ListRow, NavBar, Pill, Screen, SectionLabel, Text } from '@/shared/ui';

import { PROVIDER_LABEL, useAccountSettingsViewModel } from './useAccountSettingsViewModel';

/** Account: profile, sign-in, plan, and deleting the account. */
export function AccountSettingsScreen() {
  const vm = useAccountSettingsViewModel();

  const connection = (which: 'apple' | 'google') =>
    vm.provider === which ? (
      <ListRow key={which} title={PROVIDER_LABEL[which]} value="Connected" />
    ) : (
      <ListRow
        key={which}
        title={PROVIDER_LABEL[which]}
        value="Not connected"
        onPress={() => vm.onConnect(which)}
      />
    );

  return (
    <Screen scroll testID="settings-account">
      <NavBar title="Account" onBack={vm.onBack} />
      <View style={styles.identity}>
        <Avatar name={vm.isGuest ? null : vm.name} uri={vm.avatarUrl} size={84} />
        {vm.isGuest ? null : <Pill label={`Signed in with ${vm.providerLabel}`} tone="accent" />}
      </View>

      {vm.isGuest ? (
        <Card>
          <Text variant="sub" tone="secondary">
            You&apos;re using Streak as a guest, so your check-ins are stored only on this device. Log out and
            sign in with Apple, Google or email to keep them with an account.
          </Text>
        </Card>
      ) : (
        <>
          <SectionLabel>Profile</SectionLabel>
          <Card tight divided>
            <ListRow
              title="Name"
              value={vm.name}
              trailing="chevron"
              onPress={vm.onEditName}
              testID="account-name"
            />
            <ListRow title="Username" value={vm.username} />
            <ListRow title="Email" value={vm.email} />
          </Card>

          <SectionLabel>Sign-in & security</SectionLabel>
          <Card tight divided>
            <ListRow title="Signed in with" value={vm.providerLabel} />
            {connection('apple')}
            {connection('google')}
            <ListRow title="Time zone" value={vm.timeZone} />
          </Card>

          <SectionLabel>Subscription</SectionLabel>
          <Card tight>
            <ListRow title="Plan" value="Free" />
          </Card>

          <Card tight>
            <ListRow title="Delete account" danger centered onPress={vm.onDelete} testID="account-delete" />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  identity: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
}));
