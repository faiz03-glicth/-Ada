import { useRef, useState } from 'react';

import { ACTIVITIES } from '@/features/activities/domain/catalog';
import { useAuthStore } from '@/features/auth/state/authStore';
import { INTENSITY_LEVELS, intensityLevel } from '@/features/heatmap/domain/intensity';
import { goBack } from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { checkInCount, formatTime, longDate } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

import { MAX_NOTE_LENGTH, minuteOfDay } from '../domain/CheckIn';
import { countOn } from '../domain/checkInIndex';
import { useCheckInActions } from '../hooks/useCheckInActions';
import { useCheckIns } from '../hooks/useCheckIns';

export type WhenChoice = 'now' | 'earlier' | 'pick';

export const WHEN_OPTIONS = [
  { value: 'now', label: 'Now' },
  { value: 'earlier', label: '30 min ago' },
  { value: 'pick', label: 'Pick time' },
] as const satisfies readonly { value: WhenChoice; label: string }[];

/** "30 min ago", and how far the picked time moves per step. */
export const EARLIER_MINUTES = 30;
export const PICK_STEP_MINUTES = 15;
/** Check-ins on another day are logged at midday, as in the prototype (only the day matters). */
export const OTHER_DAY_MINUTE = 12 * 60;

/**
 * The check-in sheet: pick an activity, optionally when and a note, and check in. Two taps is enough
 * (activity, Check in). The save only reports success once the check-in is stored: the sheet closes,
 * then the toast (with Undo) and the success haptic follow. If it fails, the sheet stays open with
 * everything as entered and says what to do.
 */
export function useCheckInViewModel(date: ISODate | null) {
  const today = useToday();
  const day = date && date <= today ? date : today;
  const isToday = day === today;
  const { index } = useCheckIns();
  const actions = useCheckInActions();
  const onboardingPicks = useAuthStore((s) => s.onboardingDraft.selectedActivityIds);

  // Starts on the last activity logged (what people repeat most), else the first one they chose to track.
  const [activityId, setActivityId] = useState(
    () => index.latest?.activityId ?? onboardingPicks[0] ?? ACTIVITIES[0]?.id ?? 'workout',
  );
  const [when, setWhen] = useState<WhenChoice>('now');
  const nowMinute = minuteOfDay(new Date());
  const [picked, setPicked] = useState(() => Math.floor(nowMinute / PICK_STEP_MINUTES) * PICK_STEP_MINUTES);
  // The note lives in the field itself (uncontrolled), so typing never re-renders the sheet and nothing
  // else updating can ever reset it.
  const note = useRef('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minute = !isToday
    ? OTHER_DAY_MINUTE
    : when === 'now'
      ? nowMinute
      : when === 'earlier'
        ? Math.max(0, nowMinute - EARLIER_MINUTES)
        : Math.min(picked, nowMinute);

  const current = countOn(index, day);
  const next = current + 1;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const result = await actions.save({ date: day, minute, activityId, note: note.current });
    if (result.ok) {
      goBack();
      actions.announce(result.checkIn);
      return;
    }
    setError(result.message);
    setSaving(false);
  };

  const movePicked = (by: number) => {
    const moved = Math.max(0, Math.min(nowMinute, picked + by));
    if (moved === picked) return;
    haptics.selection();
    setPicked(moved);
  };

  return {
    activities: ACTIVITIES,
    activityId,
    isToday,
    subtitle: isToday ? `Today, ${formatTime(minute)}` : longDate(day),
    whenOptions: WHEN_OPTIONS,
    when,
    pickedLabel: formatTime(minute),
    canPickEarlier: minute > 0,
    canPickLater: minute < nowMinute,
    maxNoteLength: MAX_NOTE_LENGTH,
    preview: {
      currentLevel: intensityLevel(current),
      nextLevel: intensityLevel(next),
      text: `${isToday ? 'Today' : 'This day'} goes to ${checkInCount(next)} · ${INTENSITY_LEVELS[intensityLevel(next)].name}`,
    },
    saving,
    error,

    onPickActivity: (id: string) => {
      if (id === activityId) return;
      haptics.selection();
      setActivityId(id);
    },
    onWhen: (choice: WhenChoice) => {
      haptics.selection();
      setWhen(choice);
    },
    onEarlier: () => movePicked(-PICK_STEP_MINUTES),
    onLater: () => movePicked(PICK_STEP_MINUTES),
    onNoteChange: (text: string) => {
      note.current = text;
    },
    onNewActivity: () =>
      showInfo({ title: 'Custom activities are coming', sub: 'For now, pick one of the six activities.' }),
    onSave: () => void save(),
    onClose: () => goBack(),
  };
}

export type CheckInViewModel = ReturnType<typeof useCheckInViewModel>;
