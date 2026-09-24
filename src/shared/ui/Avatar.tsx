import { Image, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { initials } from '@/shared/lib/format/initials';

import { Text } from './Text';

export interface AvatarProps {
  name: string | null;
  uri?: string | null;
  size?: number;
}

/** Decorative: the name is always shown next to it. */
export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  return (
    <View style={styles.circle(size)} accessible={false} importantForAccessibility="no-hide-descendants">
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <Text weight="semibold" tone="accent" style={styles.initials(size)}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  circle: (size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.accentSoft,
  }),
  image: { width: '100%', height: '100%' },
  initials: (size: number) => ({ fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) }),
}));
