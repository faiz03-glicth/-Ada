import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import { Text } from './Text';

export interface BannerProps {
  message: string;
  testID?: string;
}

/** Inline error message (dangerSoft background, danger text), announced by screen readers when it appears. */
export function Banner({ message, testID }: BannerProps) {
  const { theme } = useUnistyles();
  return (
    <View
      testID={testID}
      style={styles.banner}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Icon name="alert" size={18} color={theme.colors.danger} />
      <Text variant="footnote" tone="danger" style={styles.text}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 14,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.dangerSoft,
  },
  text: { flex: 1 },
}));
