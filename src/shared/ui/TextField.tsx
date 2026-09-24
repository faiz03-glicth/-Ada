import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Spoken name of the field (placeholders are not labels). */
  label: string;
  icon?: IconName;
  error?: string | null;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, icon, error, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.field(focused, Boolean(error))}>
        {icon && <Icon name={icon} size={18} color={theme.colors.text3} />}
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error ?? inputProps.accessibilityHint}
          placeholderTextColor={theme.colors.text3}
          selectionColor={theme.colors.accent}
          keyboardAppearance={theme.scheme}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={styles.input}
        />
      </View>
      {error ? (
        <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: theme.spacing.xs + 2 },
  field: (focused: boolean, invalid: boolean) => ({
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.control,
    borderWidth: 1.5,
    borderColor: invalid ? theme.colors.danger : focused ? theme.colors.accent : 'transparent',
    backgroundColor: theme.colors.subtle,
  }),
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    fontSize: 15,
  },
}));
