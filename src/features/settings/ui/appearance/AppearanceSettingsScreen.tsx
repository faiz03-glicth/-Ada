import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Card, NavBar, Screen, SegmentedControl, Text } from '@/shared/ui';

import { useAppearanceSettingsViewModel } from './useAppearanceSettingsViewModel';

export function AppearanceSettingsScreen() {
  const vm = useAppearanceSettingsViewModel();

  return (
    <Screen scroll testID="settings-appearance">
      <NavBar title="Appearance" onBack={vm.onBack} />

      <View style={styles.section}>
        <Text variant="caption" tone="secondary" weight="semibold" style={styles.label}>
          THEME
        </Text>
        <Card style={styles.card}>
          <SegmentedControl
            options={vm.themeOptions}
            value={vm.theme}
            onChange={vm.onThemeChange}
            accessibilityLabel="Theme"
            testID="appearance-theme"
          />
          <Text variant="footnote" tone="secondary">
            {vm.themeCaption}
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="caption" tone="secondary" weight="semibold" style={styles.label}>
          REDUCE MOTION
        </Text>
        <Card style={styles.card}>
          <SegmentedControl
            options={vm.reduceMotionOptions}
            value={vm.reduceMotion}
            onChange={vm.onReduceMotionChange}
            accessibilityLabel="Reduce motion"
            testID="appearance-motion"
          />
          <Text variant="footnote" tone="secondary">
            {vm.reduceMotionCaption}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: { gap: theme.spacing.sm },
  label: { paddingHorizontal: theme.spacing.xs, letterSpacing: 0.6 },
  card: { gap: theme.spacing.md },
}));
