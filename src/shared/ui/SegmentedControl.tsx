import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

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

/** A row of mutually exclusive choices (a radio group), highlighted in the accent tint. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={testID && `${testID}-${option.value}`}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            style={styles.segment(selected)}
          >
            <Text
              variant="footnote"
              weight={selected ? 'semibold' : 'medium'}
              tone={selected ? 'accent' : 'secondary'}
            >
              {option.label}
            </Text>
          </Pressable>
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
  segment: (selected: boolean) => ({
    flex: 1,
    minHeight: 38,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: theme.radii.control - 3,
    backgroundColor: selected ? theme.colors.accentSoft : 'transparent',
  }),
}));
