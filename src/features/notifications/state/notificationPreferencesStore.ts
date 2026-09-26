import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

export interface NotificationPreferences {
  dailyReminder: boolean;
  streakProtection: boolean;
  weeklySummary: boolean;
  milestones: boolean;
  quietHours: boolean;
}

export type NotificationPreferenceKey = keyof NotificationPreferences;

interface NotificationPreferencesState extends NotificationPreferences {
  set: (key: NotificationPreferenceKey, on: boolean) => void;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyReminder: true,
  streakProtection: true,
  weeklySummary: true,
  milestones: true,
  quietHours: false,
};

/**
 * State only: which notifications the person wants, persisted. Nothing is scheduled from here yet (the
 * app has no notification service); the Notifications screen says so.
 */
export const useNotificationPreferencesStore = create<NotificationPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      set: (key, on) => set({ [key]: on }),
    }),
    {
      name: 'streak.notification-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ dailyReminder, streakProtection, weeklySummary, milestones, quietHours }) => ({
        dailyReminder,
        streakProtection,
        weeklySummary,
        milestones,
        quietHours,
      }),
    },
  ),
);
