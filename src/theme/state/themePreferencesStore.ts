import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

import type { HeatPaletteId, ThemePreference, VisualStyle } from '../types';

interface ThemePreferences {
  preference: ThemePreference;
  paletteId: HeatPaletteId;
  style: VisualStyle;
}

interface ThemePreferencesState extends ThemePreferences {
  setPreference: (preference: ThemePreference) => void;
  setPaletteId: (paletteId: HeatPaletteId) => void;
  setStyle: (style: VisualStyle) => void;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  preference: 'system',
  paletteId: 'meadow',
  // The approved prototype defaults to Liquid Glass; it only takes effect where the platform supports it.
  style: 'glass',
};

/** State only: persisted theme choices. Resolution and side effects live elsewhere. */
export const useThemePreferencesStore = create<ThemePreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_THEME_PREFERENCES,
      setPreference: (preference) => set({ preference }),
      setPaletteId: (paletteId) => set({ paletteId }),
      setStyle: (style) => set({ style }),
    }),
    {
      name: 'streak.theme-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ preference, paletteId, style }): ThemePreferences => ({ preference, paletteId, style }),
    },
  ),
);
