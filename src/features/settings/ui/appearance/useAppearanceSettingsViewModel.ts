import { useColorScheme } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import type { WeekStart } from '@/shared/lib/date/calendar';
import { useCalendarPreferencesStore } from '@/shared/state/calendarPreferencesStore';
import { useHapticPreferencesStore } from '@/shared/state/hapticPreferencesStore';
import { useSoundPreferencesStore } from '@/shared/state/soundPreferencesStore';
import {
  HEAT_PALETTE_IDS,
  heatPalettes,
  useSystemReduceMotion,
  type HeatPaletteId,
  type ReduceMotionPreference,
  type ThemePreference,
  type VisualStyle,
} from '@/theme';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';

import {
  HAPTICS_COPY,
  PALETTE_NAMES,
  PALETTE_PREVIEW,
  REDUCE_MOTION_OPTIONS,
  SOUND_EFFECTS_COPY,
  STYLE_OPTIONS,
  THEME_OPTIONS,
  WEEK_START_OPTIONS,
  reduceMotionCaption,
  themeCaption,
} from '../../config/appearance';

/**
 * Appearance settings: colour scheme and motion (both default to following the phone), the material
 * (Liquid Glass or Classic), the heatmap's palette, calendar layout, and sounds and haptics (on by default).
 */
export function useAppearanceSettingsViewModel() {
  const theme = useThemePreferencesStore((s) => s.preference);
  const reduceMotion = useThemePreferencesStore((s) => s.reduceMotion);
  const setPreference = useThemePreferencesStore((s) => s.setPreference);
  const setReduceMotion = useThemePreferencesStore((s) => s.setReduceMotion);
  const soundEffects = useSoundPreferencesStore((s) => s.soundEffects);
  const setSoundEffects = useSoundPreferencesStore((s) => s.setSoundEffects);
  const style = useThemePreferencesStore((s) => s.style);
  const setStyle = useThemePreferencesStore((s) => s.setStyle);
  const paletteId = useThemePreferencesStore((s) => s.paletteId);
  const setPaletteId = useThemePreferencesStore((s) => s.setPaletteId);
  const calendar = useCalendarPreferencesStore();
  const hapticsOn = useHapticPreferencesStore((s) => s.haptics);
  const setHaptics = useHapticPreferencesStore((s) => s.setHaptics);
  const { theme: current } = useUnistyles();
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
    hapticsCopy: HAPTICS_COPY,
    haptics: hapticsOn,
    styleOptions: STYLE_OPTIONS,
    style,
    palettes: HEAT_PALETTE_IDS.map((id) => ({
      id,
      name: PALETTE_NAMES[id],
      swatches: heatPalettes[id][current.scheme],
      selected: id === paletteId,
    })),
    palettePreview: PALETTE_PREVIEW,
    weekStartOptions: WEEK_START_OPTIONS,
    weekStart: calendar.weekStart,
    showLegend: calendar.showLegend,
    outlineToday: calendar.outlineToday,

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
    // Turning haptics off is felt as a last tap; turning them on, as the first.
    onHapticsChange: (on: boolean) => {
      if (on) setHaptics(true);
      haptics.selection();
      if (!on) setHaptics(false);
    },
    onStyleChange: (next: VisualStyle) => {
      haptics.selection();
      setStyle(next);
    },
    onPaletteChange: (next: HeatPaletteId) => {
      if (next === paletteId) return;
      haptics.selection();
      setPaletteId(next);
    },
    onWeekStartChange: (next: WeekStart) => {
      haptics.selection();
      calendar.setWeekStart(next);
    },
    onShowLegendChange: (on: boolean) => {
      haptics.selection();
      calendar.setShowLegend(on);
    },
    onOutlineTodayChange: (on: boolean) => {
      haptics.selection();
      calendar.setOutlineToday(on);
    },
    onBack: () => goBack(),
  };
}

export type AppearanceSettingsViewModel = ReturnType<typeof useAppearanceSettingsViewModel>;
