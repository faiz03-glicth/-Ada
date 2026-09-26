import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

import type { WeekStart } from '../lib/date/calendar';

interface CalendarPreferences {
  /** Which day heatmap rows, "This week" and weekly charts start on. */
  weekStart: WeekStart;
  /** The Less → More scale under the Home heatmap. */
  showLegend: boolean;
  /** Today's cell carries an outline on every heatmap. */
  outlineToday: boolean;
}

interface CalendarPreferencesState extends CalendarPreferences {
  setWeekStart: (weekStart: WeekStart) => void;
  setShowLegend: (on: boolean) => void;
  setOutlineToday: (on: boolean) => void;
}

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  weekStart: 'mon',
  showLegend: true,
  outlineToday: true,
};

/** State only: how calendars and heatmaps are laid out, persisted. Appearance settings change it. */
export const useCalendarPreferencesStore = create<CalendarPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_CALENDAR_PREFERENCES,
      setWeekStart: (weekStart) => set({ weekStart }),
      setShowLegend: (showLegend) => set({ showLegend }),
      setOutlineToday: (outlineToday) => set({ outlineToday }),
    }),
    {
      name: 'streak.calendar-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ weekStart, showLegend, outlineToday }): CalendarPreferences => ({
        weekStart,
        showLegend,
        outlineToday,
      }),
    },
  ),
);
