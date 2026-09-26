import { create } from 'zustand';

import type { ISODate } from '@/shared/lib/date/isoDate';
import { motion } from '@/theme';

/** The pulse is over by then: the cell goes back to being a plain cell (a remount won't replay it). */
const PULSE_MS = motion.pulse.durationMs * motion.pulse.repeats + 100;

interface CheckInFeedbackState {
  /** The day that was just checked in (its heatmap cell pulses once), or null. */
  pulseDay: ISODate | null;
  /** Bumped on every check-in, so checking the same day twice pulses twice. */
  pulseId: number;
  pulse: (day: ISODate) => void;
  clearPulse: () => void;
}

/** Transient UI state (never persisted): "just saved", for the heatmap to answer. */
export const useCheckInFeedbackStore = create<CheckInFeedbackState>()((set, get) => ({
  pulseDay: null,
  pulseId: 0,
  pulse: (day) => {
    const id = get().pulseId + 1;
    set({ pulseDay: day, pulseId: id });
    setTimeout(() => {
      if (get().pulseId === id) set({ pulseDay: null });
    }, PULSE_MS);
  },
  clearPulse: () => set({ pulseDay: null }),
}));
