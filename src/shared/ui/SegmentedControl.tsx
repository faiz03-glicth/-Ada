import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { Crossfade } from './Crossfade';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers (e.g. "Theme"). */
  accessibilityLabel: string;
  /** Each segment gets `${testID}-${value}`. */
  testID?: string;
}

/**
 * A row of mutually exclusive choices (a radio group). The selection's tint and its label's colour and
 * weight ease from the old segment to the new one; with Reduce Motion they change instantly.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<T>) {
  const { theme } = useUnistyles();
  const tint = useStateTransition('backgroundColor', 'normal');

  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <AnimatedPressable
            key={option.value}
            testID={testID && `${testID}-${option.value}`}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            // Unselected segments take the track's colour (not transparent) so the tint eases cleanly.
            style={[
              styles.segment,
              { backgroundColor: selected ? theme.colors.accentSoft : theme.colors.subtle },
              tint,
            ]}
          >
            <Crossfade
              active={selected}
              on={
                <Text variant="footnote" weight="semibold" tone="accent">
                  {option.label}
                </Text>
              }
              off={
                <Text variant="footnote" weight="medium" tone="secondary">
                  {option.label}
                </Text>
              }
            />
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: theme.radii.control,
    backgroundColor: theme.colors.subtle,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.control - 3,
  },
}));
