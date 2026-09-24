import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/shared/ui';

export function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.heading}>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="lead" tone="secondary">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  heading: { gap: 10, marginTop: theme.spacing.xs + 2 },
}));
