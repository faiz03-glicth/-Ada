import { View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

const ACTIVE = 20;
const REST = 6;

export interface PageDotsProps {
  count: number;
  index: number;
  /**
   * The pager's position, in pages. Given, the dots follow the finger: the active pill stretches from one
   * dot to the next as the page is swiped. Without it, the dots ease to the new index.
   */
  progress?: SharedValue<number>;
}

/** A dot that follows the pager: its closeness to the current position sets its width and colour. */
function FollowingDot({ dot, progress }: { dot: number; progress: SharedValue<number> }) {
  const { theme } = useUnistyles();
  const active = theme.colors.accent;
  const rest = theme.colors.border2;
  const style = useAnimatedStyle(() => {
    const distance = Math.min(1, Math.abs(progress.get() - dot));
    return {
      width: ACTIVE - (ACTIVE - REST) * distance,
      backgroundColor: interpolateColor(distance, [0, 1], [active, rest]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

/** Progress dots; the active one is a 20×6 accent pill. Read as "Step 2 of 3". */
export function PageDots({ count, index, progress }: PageDotsProps) {
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
      {Array.from({ length: count }, (_, i) =>
        progress ? (
          <FollowingDot key={i} dot={i} progress={progress} />
        ) : (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: i === index ? ACTIVE : REST,
                backgroundColor: i === index ? theme.colors.accent : theme.colors.border2,
              },
              step,
            ]}
          />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: REST, borderRadius: REST / 2 },
}));
