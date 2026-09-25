import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useStateTransition } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './icons';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  /** No background circle (nav bars). */
  plain?: boolean;
  disabled?: boolean;
  testID?: string;
}

const SIZE = 34;
/** Extends the 34pt circle to a 44pt touch target. */
const HIT_SLOP = (44 - SIZE) / 2;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  plain = false,
  disabled = false,
  testID,
}: IconButtonProps) {
  const { theme } = useUnistyles();
  // Disabled eases in and out like every other control (e.g. Back while a sign-in connects).
  const fade = useStateTransition('opacity');
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[styles.base(plain), { opacity: disabled ? 0.45 : 1 }, fade]}
    >
      <Icon name={icon} size={plain ? 24 : 20} color={theme.colors.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: (plain: boolean) => ({
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: plain ? 'transparent' : theme.glass ? theme.glass.strong : theme.colors.subtle,
  }),
}));
