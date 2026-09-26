import Constants from 'expo-constants';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { goBack, openHelpCenter, openLegal, rateApp, sendFeedback } from '@/shared/actions';
import { Card, ListRow, LogoMark, NavBar, Screen, Text } from '@/shared/ui';

/** About: who we are, the version, and the ways to reach us or read the fine print. Lightweight. */
export function AboutSettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll testID="settings-about">
      <NavBar title="About" onBack={() => goBack()} />
      <View style={styles.identity}>
        <LogoMark size={88} />
        <Text variant="title3" accessibilityRole="header">
          Streak
        </Text>
        <Text variant="footnote" tone="secondary">
          Version {version}
        </Text>
      </View>
      <Card tight divided>
        <ListRow
          title="Rate Streak"
          icon="star"
          iconColor="orange"
          trailing="chevron"
          onPress={() => void rateApp()}
        />
        <ListRow
          title="Send feedback"
          icon="mail"
          iconColor="blue"
          trailing="chevron"
          onPress={() => void sendFeedback()}
        />
        <ListRow
          title="Help center"
          icon="help"
          iconColor="green"
          trailing="chevron"
          onPress={() => void openHelpCenter()}
        />
      </Card>
      <Card tight divided>
        <ListRow title="Terms of service" trailing="chevron" onPress={() => void openLegal('terms')} />
        <ListRow title="Privacy policy" trailing="chevron" onPress={() => void openLegal('privacy')} />
        <ListRow
          title="Acknowledgements"
          trailing="chevron"
          onPress={() => void openLegal('acknowledgements')}
        />
      </Card>
      <Text variant="mini" tone="tertiary" align="center">
        Small check-ins, every day.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  identity: { alignItems: 'center', gap: 10, paddingVertical: theme.spacing.md },
}));
