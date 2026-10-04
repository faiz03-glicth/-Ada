import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

interface SyncPreferences {
  /** Back up check-ins to the account and bring in changes from other phones. On by default. */
  enabled: boolean;
}

interface SyncPreferencesState extends SyncPreferences {
  setEnabled: (enabled: boolean) => void;
}

/** State only: the Sync switch in Data & privacy, persisted on this phone. */
export const useSyncPreferencesStore = create<SyncPreferencesState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'streak.sync-preferences',
      version: 1,
      storage: persistStorage,
      partialize: ({ enabled }): SyncPreferences => ({ enabled }),
    },
  ),
);
