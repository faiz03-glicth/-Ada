import { create } from 'zustand';

import type { SyncStatus } from '../domain/syncStatus';

interface SyncStatusState {
  status: SyncStatus;
  setStatus: (status: SyncStatus) => void;
}

/** State only: what sync is doing right now, for Data & privacy. Not persisted. */
export const useSyncStatusStore = create<SyncStatusState>()((set) => ({
  status: { kind: 'idle', refused: 0 },
  setStatus: (status) => set({ status }),
}));
