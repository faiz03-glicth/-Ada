import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[styles.base(plain), disabled && styles.disabled]}
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
  disabled: { opacity: 0.45 },
}));
