import { useColorScheme } from 'react-native';

import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { useSystemReduceMotion, type ReduceMotionPreference, type ThemePreference } from '@/theme';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';

import {
  REDUCE_MOTION_OPTIONS,
  THEME_OPTIONS,
  reduceMotionCaption,
  themeCaption,
} from '../../config/appearance';

/** Appearance settings: colour scheme and motion. Both default to following the phone. */
export function useAppearanceSettingsViewModel() {
  const theme = useThemePreferencesStore((s) => s.preference);
  const reduceMotion = useThemePreferencesStore((s) => s.reduceMotion);
  const setPreference = useThemePreferencesStore((s) => s.setPreference);
  const setReduceMotion = useThemePreferencesStore((s) => s.setReduceMotion);
  // With 'system' selected the app doesn't override the native scheme, so this is the phone's own.
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const systemReduceMotion = useSystemReduceMotion();

  return {
    themeOptions: THEME_OPTIONS,
    theme,
    themeCaption: themeCaption(theme, systemScheme),
    reduceMotionOptions: REDUCE_MOTION_OPTIONS,
    reduceMotion,
    reduceMotionCaption: reduceMotionCaption(reduceMotion, systemReduceMotion),

    onThemeChange: (next: ThemePreference) => {
      haptics.selection();
      setPreference(next);
    },
    onReduceMotionChange: (next: ReduceMotionPreference) => {
      haptics.selection();
      setReduceMotion(next);
    },
    onBack: () => goBack(),
  };
}

export type AppearanceSettingsViewModel = ReturnType<typeof useAppearanceSettingsViewModel>;
