import {
  addDays,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  monthOf,
  monthShort,
  startOfWeek,
  weekdayIndex,
  weekdayOf,
  type WeekStart,
  type YearMonth,
} from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { checkInCount, shortDate } from '@/shared/lib/format/dates';

import type { HeatGrid, HeatGridCell } from './grid';
import { intensityLevel } from './intensity';

/**
 * PURE builders for the real heatmaps (Home, Calendar year and month, Profile, Appearance preview). Every
 * one uses the same rules: intensityLevel for colour, future days hollow, today outlined (if the person
 * wants it), the selected day ringed. They only need a way to count a day, so they don't depend on how
 * check-ins are stored.
 */
export interface DayCellOptions {
  countOn: (day: ISODate) => number;
  today: ISODate;
  weekStart: WeekStart;
  outlineToday: boolean;
  selected?: ISODate | null;
}

function blank(index: number): HeatGridCell {
  return { key: `blank-${index}`, level: 0, state: 'blank' };
}

/** One real day. Future days have no label: there's nothing to open. */
export function dayCell(day: ISODate, options: DayCellOptions): HeatGridCell {
  if (day > options.today) return { key: day, level: 0, state: 'future' };
  const count = options.countOn(day);
  const state =
    day === options.selected
      ? 'selected'
      : day === options.today && options.outlineToday
        ? 'today'
        : 'default';
  return {
    key: day,
    level: intensityLevel(count),
    state,
    count,
    label: `${shortDate(day)}: ${checkInCount(count)}`,
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** A month's cells in week order, led by blanks up to the first day's weekday. */
function monthCells(month: YearMonth, options: DayCellOptions): HeatGridCell[] {
  const first = firstOfMonth(month);
  const offset = weekdayIndex(weekdayOf(first), options.weekStart);
  return [
    ...Array.from({ length: offset }, (_, i) => blank(i)),
    ...eachDay(first, lastOfMonth(month)).map((day) => dayCell(day, options)),
  ];
}

/** A month as heatmap columns (one per week, weekdays top to bottom), as on Home and the year view. */
export function buildMonthGrid(month: YearMonth, options: DayCellOptions): HeatGrid {
  return { columns: chunk(monthCells(month, options), 7) };
}

/** A month as calendar rows (one per week, weekdays left to right), for the month view's day tiles. */
export function buildMonthCalendar(month: YearMonth, options: DayCellOptions): HeatGridCell[][] {
  const rows = chunk(monthCells(month, options), 7);
  const last = rows.at(-1);
  while (last && last.length < 7) last.push(blank(100 + last.length));
  return rows;
}

export interface WeeksGrid {
  grid: HeatGrid;
  /** A month name over the week its first day falls in, '' elsewhere. */
  monthLabels: readonly string[];
}

/** The last `weeks` weeks up to this one (Profile's "Last 20 weeks", the Appearance preview). */
export function buildWeeksGrid(weeks: number, options: DayCellOptions): WeeksGrid {
  const start = addDays(startOfWeek(options.today, options.weekStart), -7 * (weeks - 1));
  const columns: HeatGridCell[][] = [];
  const monthLabels: string[] = [];
  for (let week = 0; week < weeks; week += 1) {
    const days = eachDay(addDays(start, week * 7), addDays(start, week * 7 + 6));
    columns.push(days.map((day) => dayCell(day, options)));
    const first = days.find((day) => day.endsWith('-01'));
    monthLabels.push(first ? monthShort(monthOf(first).month) : '');
  }
  return { grid: { columns }, monthLabels };
}
