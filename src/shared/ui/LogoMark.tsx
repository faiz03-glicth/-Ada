import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { HeatLevel } from '@/theme';

import { HeatCell } from './HeatCell';

const PATTERN: readonly HeatLevel[] = [2, 4, 3, 1, 3, 4, 3, 2, 4];

export interface LogoMarkProps {
  size?: number;
}

/** The Streak mark: a 3×3 patch of heatmap. Proportions scale from the 76pt login version. */
export function LogoMark({ size = 76 }: LogoMarkProps) {
  const padding = Math.round(size * (12 / 76));
  const gap = Math.max(2, Math.round(size * (4 / 76)));
  const cell = (size - 2 - padding * 2 - gap * 2) / 3;

  return (
    <View
      style={styles.mark(size, padding, gap)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {PATTERN.map((level, index) => (
        <HeatCell key={index} level={level} size={cell} radius={4} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  mark: (size: number, padding: number, gap: number) => ({
    width: size,
    height: size,
    padding,
    gap,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    borderRadius: Math.round(size * (22 / 76)),
    borderWidth: 1,
    borderColor: theme.glass?.card.edge ?? theme.colors.border,
    backgroundColor: theme.glass?.strong ?? theme.colors.surface,
    boxShadow: theme.elevation.card ?? undefined,
  }),
}));
