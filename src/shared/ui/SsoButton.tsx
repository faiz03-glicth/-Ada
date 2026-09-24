import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, Text as RNText, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { GoogleLogo } from './GoogleLogo';
import { PressableScale } from './PressableScale';

export type SsoProvider = 'apple' | 'google';

export interface SsoButtonProps {
  provider: SsoProvider;
  onPress: () => void;
  /** This button's sign-in is in progress: spinner + "Connecting…". */
  busy?: boolean;
  /** Another sign-in is in progress. */
  disabled?: boolean;
  /** Google label; Apple always uses the native "Sign in with Apple". */
  label?: string;
}

const HEIGHT = 52;
const BUSY_LABEL = 'Connecting…';

/**
 * Provider sign-in buttons that follow each brand's rules:
 * Apple renders the native AppleAuthenticationButton (black in light, white in dark). Its label can't change,
 * so while busy it is swapped for a same-size pill with a spinner. Google uses the official "G" and Roboto Medium.
 */
export function SsoButton({
  provider,
  onPress,
  busy = false,
  disabled = false,
  label = 'Continue with Google',
}: SsoButtonProps) {
  const { theme } = useUnistyles();
  const colors = provider === 'apple' ? theme.brand.apple : theme.brand.google;

  if (busy) {
    return (
      <View
        style={styles.pill(colors.background, provider === 'google' ? theme.brand.google.border : null)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={BUSY_LABEL}
        accessibilityState={{ busy: true, disabled: true }}
      >
        <ActivityIndicator size="small" color={colors.foreground} />
        <RNText style={styles.label(provider, colors.foreground)}>{BUSY_LABEL}</RNText>
      </View>
    );
  }

  if (provider === 'apple') {
    // Sign in with Apple is iOS-only; the native button doesn't exist elsewhere.
    if (Platform.OS !== 'ios') return null;
    return (
      <View
        style={disabled && styles.disabled}
        pointerEvents={disabled ? 'none' : 'auto'}
        accessibilityState={{ disabled }}
      >
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            theme.scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={HEIGHT / 2}
          style={styles.native}
          onPress={onPress}
        />
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.pill(colors.background, theme.brand.google.border), disabled && styles.disabled]}
    >
      <GoogleLogo size={20} />
      <RNText style={styles.label('google', colors.foreground)}>{label}</RNText>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  pill: (background: string, border: string | null) => ({
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    backgroundColor: background,
    borderWidth: border ? 1 : 0,
    borderColor: border ?? undefined,
  }),
  native: { height: HEIGHT, width: '100%' },
  // Apple's busy pill uses the system font to match the native button next to it.
  label: (provider: SsoProvider, color: string) => ({
    color,
    fontSize: 17,
    fontFamily: provider === 'google' ? theme.fonts.googleLabel : undefined,
    fontWeight: provider === 'apple' ? ('600' as const) : undefined,
  }),
  disabled: { opacity: 0.45 },
}));
