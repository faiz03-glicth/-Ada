import type { ColorScheme, ReduceMotionPreference, ThemePreference } from '@/theme';

export const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

export const REDUCE_MOTION_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const satisfies readonly { value: ReduceMotionPreference; label: string }[];

/** PURE: what the theme choice means right now. */
export function themeCaption(preference: ThemePreference, system: ColorScheme): string {
  if (preference === 'system') {
    return `Matches your phone (${system === 'dark' ? 'dark' : 'light'} right now).`;
  }
  return preference === 'dark' ? 'Always dark.' : 'Always light.';
}

/** PURE: what the motion choice means right now. */
export function reduceMotionCaption(preference: ReduceMotionPreference, system: boolean): string {
  if (preference === 'system') {
    return `Matches your phone (${system ? 'reduced' : 'full motion'} right now).`;
  }
  return preference === 'on'
    ? 'No stretching or bouncing; screens fade instead of sliding.'
    : 'Full motion, even if your phone reduces it.';
}

export const SOUND_EFFECTS_COPY = {
  title: 'Sound effects',
  description: 'Short sounds for moments like flipping the logo.',
};
