import { activityById } from '@/features/activities/domain/catalog';

import type { CheckIn } from './CheckIn';

/** 450 → "07:30" (24-hour, for files). */
function clock(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** A CSV field, quoted when it holds a comma, quote or line break. */
function field(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const byTime = (a: CheckIn, b: CheckIn) =>
  a.date === b.date ? a.minute - b.minute : a.date < b.date ? -1 : 1;

/** PURE: every check-in as a spreadsheet, oldest first. */
export function checkInsToCsv(checkIns: readonly CheckIn[]): string {
  const rows = [...checkIns]
    .sort(byTime)
    .map((c) => [c.date, clock(c.minute), activityById(c.activityId).name, c.note].map(field).join(','));
  return ['date,time,activity,note', ...rows].join('\n');
}

/** PURE: every check-in as a JSON backup, oldest first. */
export function checkInsToJson(checkIns: readonly CheckIn[]): string {
  const rows = [...checkIns].sort(byTime).map((c) => ({
    date: c.date,
    time: clock(c.minute),
    activity: c.activityId,
    note: c.note,
  }));
  return JSON.stringify({ app: 'Streak', version: 1, checkIns: rows }, null, 2);
}
