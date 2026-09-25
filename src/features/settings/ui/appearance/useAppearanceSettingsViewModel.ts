import { useColorScheme } from 'react-native';

import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { useSoundPreferencesStore } from '@/shared/state/soundPreferencesStore';
import { useSystemReduceMotion, type ReduceMotionPreference, type ThemePreference } from '@/theme';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';

import {
  REDUCE_MOTION_OPTIONS,
  SOUND_EFFECTS_COPY,
  THEME_OPTIONS,
  reduceMotionCaption,
  themeCaption,
} from '../../config/appearance';

/**
 * Appearance settings: colour scheme and motion (both default to following the phone), and sound effects
 * (on by default).
 */
export function useAppearanceSettingsViewModel() {
  const theme = useThemePreferencesStore((s) => s.preference);
  const reduceMotion = useThemePreferencesStore((s) => s.reduceMotion);
  const setPreference = useThemePreferencesStore((s) => s.setPreference);
  const setReduceMotion = useThemePreferencesStore((s) => s.setReduceMotion);
  const soundEffects = useSoundPreferencesStore((s) => s.soundEffects);
  const setSoundEffects = useSoundPreferencesStore((s) => s.setSoundEffects);
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
    soundEffectsCopy: SOUND_EFFECTS_COPY,
    soundEffects,

    onThemeChange: (next: ThemePreference) => {
      haptics.selection();
      setPreference(next);
    },
    onReduceMotionChange: (next: ReduceMotionPreference) => {
      haptics.selection();
      setReduceMotion(next);
    },
    onSoundEffectsChange: (on: boolean) => {
      haptics.selection();
      setSoundEffects(on);
    },
    onBack: () => goBack(),
  };
}

export type AppearanceSettingsViewModel = ReturnType<typeof useAppearanceSettingsViewModel>;
