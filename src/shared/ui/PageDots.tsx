import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

export interface PageDotsProps {
  count: number;
  index: number;
}

/** Progress dots; the active one is a 20×6 accent pill. Read as "Step 2 of 3". */
export function PageDots({ count, index }: PageDotsProps) {
  const { theme } = useUnistyles();
  // Width is animated on purpose here: the growing pill IS the step change (tiny, isolated views).
  const step = useStateTransition(['width', 'backgroundColor'], 'normal');
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: i === index ? 20 : 6,
              backgroundColor: i === index ? theme.colors.accent : theme.colors.border2,
            },
            step,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
}));
