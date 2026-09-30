import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ACTIVITIES } from '@/features/activities/domain/catalog';
import { useAuthStore } from '@/features/auth/state/authStore';
import { quickCheckInMinute, startingActivityId, type CheckIn } from '@/features/checkins/domain/CheckIn';
import { checkInsOn, countOn } from '@/features/checkins/domain/checkInIndex';
import { useCheckInActions } from '@/features/checkins/hooks/useCheckInActions';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { INTENSITY_LEVELS, intensityLevel } from '@/features/heatmap/domain/intensity';
import { goBack, openCheckIn } from '@/shared/actions';
import { addDays, fromISODate, monthLong, monthOf, weekdayShort } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { checkInCount, longDate } from '@/shared/lib/format/dates';
import { haptics } from '@/shared/lib/haptics';
import type { WheelDay } from '@/shared/ui';
import { useToastsAtTop } from '@/shared/ui/toast';

import { daysSoFar } from '../domain/openingDay';
import { chosenDayMemory } from '../state/chosenDayMemory';

/**
 * The Day sheet: one month's date wheel, with the chosen day's summary, Check in and timeline under it.
 * The chosen day is the sheet's one piece of day state: it starts on the linked day (a bad or future link
 * means today), the wheel changes it, and everything below reads it. Checking in never closes the sheet,
 * so several days can be logged in a row: swipe, Check in, swipe, Check in.
 */
export function useDaySheetViewModel(date: ISODate | null) {
  const today = useToday();
  const { index } = useCheckIns();
  const actions = useCheckInActions();
  const onboardingPicks = useAuthStore((s) => s.onboardingDraft.selectedActivityIds);

  // Check in sits where a toast would land, and it's pressed again and again: toasts go to the top here.
  useToastsAtTop();

  const [chosen, setChosen] = useState<ISODate>(() => (date && date <= today ? date : today));
  const [activityId, setActivityId] = useState(() => startingActivityId(index.latest, onboardingPicks));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The wheel holds the chosen day's month and never leaves it.
  const { year, month } = monthOf(chosen);
  const dayKeys = useMemo(() => daysSoFar({ year, month }, today), [year, month, today]);
  const days = useMemo<WheelDay[]>(
    () =>
      dayKeys.map((day) => {
        const count = countOn(index, day);
        const at = fromISODate(day);
        return {
          key: day,
          weekday: weekdayShort(at.getDay()).slice(0, 1),
          date: at.getDate(),
          level: intensityLevel(count),
          today: day === today,
          label: `${longDate(day)}, ${checkInCount(count)}`,
        };
      }),
    [dayKeys, index, today],
  );

  // The handlers read the latest choices through this ref, so they keep one identity and the log controls
  // don't re-render every time the day changes.
  const latest = useRef({ chosen, activityId });
  useEffect(() => {
    latest.current = { chosen, activityId };
  });
  // One save at a time, even for two presses in the same frame.
  const inFlight = useRef(false);

  const onFocusChange = useCallback(
    (next: number) => {
      const day = dayKeys[next];
      if (!day) return;
      setChosen(day);
      setError(null);
      chosenDayMemory.set(day);
    },
    [dayKeys],
  );

  const onPickActivity = useCallback((id: string) => {
    if (id === latest.current.activityId) return;
    haptics.selection();
    setActivityId(id);
    setError(null);
  }, []);

  // Saves for the day centred at the press, even if the wheel moves before the save lands.
  const save = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const { chosen: day, activityId: picked } = latest.current;
    setSaving(true);
    setError(null);
    const result = await actions.save({
      date: day,
      minute: quickCheckInMinute(day, today, new Date()),
      activityId: picked,
      note: '',
    });
    inFlight.current = false;
    setSaving(false);
    if (result.ok) actions.announce(result.checkIn);
    else setError(result.message);
  }, [actions, today]);
  const onCheckIn = useCallback(() => void save(), [save]);

  const onMore = useCallback(() => {
    const { chosen: day, activityId: picked } = latest.current;
    openCheckIn({ date: day, activityId: picked });
  }, []);
  const onOptions = useCallback((checkIn: CheckIn) => void actions.remove(checkIn), [actions]);

  const checkIns = checkInsOn(index, chosen);
  const level = intensityLevel(checkIns.length);
  const info = INTENSITY_LEVELS[level];

  return {
    title: `${monthLong(month)} ${year}`,
    wheelLabel: `Days in ${monthLong(month)}`,
    days,
    focusedIndex: Math.max(0, dayKeys.indexOf(chosen)),
    onFocusChange,

    day: chosen,
    dayTitle: longDate(chosen),
    relative: chosen === today ? 'Today' : chosen === addDays(today, -1) ? 'Yesterday' : null,
    count: checkIns.length,
    level,
    levelLabel: `${info.name} · ${info.rangeLabel}`,
    summaryLabel: `${checkInCount(checkIns.length)}, ${info.name}`,
    checkIns,
    onOptions,

    activities: ACTIVITIES,
    activityId,
    saving,
    error,
    moreLabel: chosen === today ? 'Add a note or time' : 'Add a note',
    onPickActivity,
    onCheckIn,
    onMore,
    onClose: () => goBack(),
  };
}

export type DaySheetViewModel = ReturnType<typeof useDaySheetViewModel>;
