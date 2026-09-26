import { useCallback, useMemo, useState } from 'react';

import { countOn, type CheckInIndex } from '@/features/checkins/domain/checkInIndex';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { INTENSITY_LEVELS, intensityLevel } from '@/features/heatmap/domain/intensity';
import { goBack, openDayFromPicker, type DayPickerOptions } from '@/shared/actions';
import {
  eachDay,
  firstOfMonth,
  fromISODate,
  lastOfMonth,
  minDay,
  monthLong,
  monthOf,
  weekdayShort,
  type YearMonth,
} from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { checkInCount, dayLabel, longDate } from '@/shared/lib/format/dates';
import type { WheelDay } from '@/shared/ui';

import { dayPickerMemory } from '../state/dayPickerMemory';

const monthKey = ({ year, month }: YearMonth) => `${year}-${month}`;

/**
 * PURE: where the wheel opens in a month. The day last chosen there (this session), else today if it's
 * in this month, else the month's most recent day with a check-in, else its last day.
 */
export function openingIndex(
  days: readonly ISODate[],
  today: ISODate,
  index: CheckInIndex,
  remembered: ISODate | undefined,
): number {
  const at = (day: ISODate | undefined) => (day === undefined ? -1 : days.indexOf(day));
  const recent = index.days.find((day) => days.includes(day));
  for (const candidate of [remembered, today, recent]) {
    const found = at(candidate);
    if (found >= 0) return found;
  }
  return Math.max(0, days.length - 1);
}

/**
 * The date wheel for one month (a heatmap month was chosen): every day of it that has happened, the one
 * under the centre is chosen, and Open continues to that day's details. The chosen day is this screen's
 * one piece of state; the wheel reports each change once.
 */
export function useDayPickerViewModel(options: DayPickerOptions | null) {
  const today = useToday();
  const { index, loading } = useCheckIns();
  const current = monthOf(today);

  // A month that hasn't started yet (or a bad link) opens on this month instead.
  const month = useMemo<YearMonth>(() => {
    if (!options) return current;
    const asked = { year: options.year, month: options.month - 1 };
    return firstOfMonth(asked) > today ? current : asked;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `current` is derived from `today`
  }, [options?.year, options?.month, today]);

  const dayKeys = useMemo(
    () => eachDay(firstOfMonth(month), minDay(lastOfMonth(month), today)),
    [month, today],
  );
  const days = useMemo<WheelDay[]>(
    () =>
      dayKeys.map((day) => {
        const date = fromISODate(day);
        const count = countOn(index, day);
        return {
          key: day,
          weekday: weekdayShort(date.getDay()).slice(0, 1),
          date: date.getDate(),
          level: intensityLevel(count),
          today: day === today,
          label: `${longDate(day)}, ${checkInCount(count)}`,
        };
      }),
    [dayKeys, index, today],
  );

  // Chosen by the person (null until they move the wheel); until then, where the wheel opens, worked out
  // from the check-ins once they've loaded (the wheel itself waits for them, see `ready`).
  const [focused, setFocused] = useState<number | null>(null);
  const opening = openingIndex(dayKeys, today, index, dayPickerMemory.get(monthKey(month)));
  const safe = Math.min(focused ?? opening, days.length - 1);
  const day = dayKeys[safe] ?? today;
  const count = countOn(index, day);
  const level = intensityLevel(count);
  const info = INTENSITY_LEVELS[level];

  const onFocusChange = useCallback(
    (next: number) => {
      setFocused(next);
      const chosen = dayKeys[next];
      if (chosen) dayPickerMemory.set(monthKey(month), chosen);
    },
    [dayKeys, month],
  );

  return {
    /** The check-ins are in: the wheel can open on the right day. */
    ready: !loading,
    title: `${monthLong(month.month)} ${month.year}`,
    wheelLabel: `Days in ${monthLong(month.month)}`,
    days,
    focusedIndex: safe,
    day,
    dayEyebrow: dayLabel(day, today),
    dayTitle: longDate(day),
    count,
    level,
    levelLabel: `${info.name} · ${info.rangeLabel}`,
    openLabel: `Open ${dayLabel(day, today)}`,

    onFocusChange,
    onOpen: () => openDayFromPicker(day),
    onClose: () => goBack(),
  };
}

export type DayPickerViewModel = ReturnType<typeof useDayPickerViewModel>;
