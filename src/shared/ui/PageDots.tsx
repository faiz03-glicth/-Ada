import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export interface PageDotsProps {
  count: number;
  index: number;
}

/** Progress dots; the active one is a 20×6 accent pill. Read as "Step 2 of 3". */
export function PageDots({ count, index }: PageDotsProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${index + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.dot(i === index)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: (active: boolean) => ({
    width: active ? 20 : 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: active ? theme.colors.accent : theme.colors.border2,
  }),
}));
