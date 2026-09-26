import { buildLevelGrid, type HeatGrid } from '@/features/heatmap/domain/grid';
import type { IntensityLevel } from '@/features/heatmap/domain/intensity';
import type { WeekStart } from '@/shared/lib/date/calendar';
import { seededRandom } from '@/shared/lib/random/seededRandom';
import type {
  ColorScheme,
  HeatPaletteId,
  ReduceMotionPreference,
  ThemePreference,
  VisualStyle,
} from '@/theme';

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

export const STYLE_OPTIONS = [
  { value: 'glass', label: 'Liquid Glass' },
  { value: 'classic', label: 'Classic' },
] as const satisfies readonly { value: VisualStyle; label: string }[];

export const WEEK_START_OPTIONS = [
  { value: 'mon', label: 'Mon' },
  { value: 'sun', label: 'Sun' },
] as const satisfies readonly { value: WeekStart; label: string }[];

export const PALETTE_NAMES: Record<HeatPaletteId, string> = {
  meadow: 'Meadow',
  ocean: 'Ocean',
  violet: 'Violet',
  amber: 'Amber',
};

/** A fixed sample of every level, so a palette can be judged before anything has been logged. */
function samplePattern(): HeatGrid {
  const next = seededRandom(24);
  return buildLevelGrid(17, 7, (): IntensityLevel =>
    next() < 0.2 ? 0 : ((1 + Math.floor(next() * 4)) as IntensityLevel),
  );
}
export const PALETTE_PREVIEW = samplePattern();

export const HAPTICS_COPY = {
  title: 'Haptic feedback',
  description: 'Gentle taps when you choose, save or undo something.',
};

export const SOUND_EFFECTS_COPY = {
  title: 'Sound effects',
  description: 'Short sounds for moments like flipping the logo.',
};
