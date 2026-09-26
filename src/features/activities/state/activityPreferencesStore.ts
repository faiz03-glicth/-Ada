import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 8;

interface ActivityPreferences {
  /** Check-ins a day the person aims for (1–8). */
  dailyGoal: number;
}

interface ActivityPreferencesState extends ActivityPreferences {
  /** Clamped to 1–8. */
  setDailyGoal: (goal: number) => void;
}

/** State only: activity preferences, persisted. */
export const useActivityPreferencesStore = create<ActivityPreferencesState>()(
  persist(
    (set) => ({
      dailyGoal: 4,
      setDailyGoal: (goal) =>
        set({ dailyGoal: Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, Math.round(goal))) }),
    }),
    {
      name: 'streak.activity-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ dailyGoal }): ActivityPreferences => ({ dailyGoal }),
    },
  ),
);
