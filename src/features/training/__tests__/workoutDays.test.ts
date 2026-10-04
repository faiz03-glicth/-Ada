import { buildMonthGrid } from '@/features/heatmap/domain/calendarGrid';
import type { ISODate } from '@/shared/lib/date/isoDate';

import {
  WORKOUT_DAY_LEVEL,
  workoutDayCells,
  workoutDayCount,
  workoutDaysBetween,
} from '../domain/workoutDays';

const day = (value: string) => value as ISODate;
const days = new Set([day('2026-09-30'), day('2026-10-01'), day('2026-10-03')]);

describe('workout days', () => {
  it('counts them in words', () => {
    expect(workoutDayCount(0)).toBe('0 workout days');
    expect(workoutDayCount(1)).toBe('1 workout day');
    expect(workoutDayCount(12)).toBe('12 workout days');
  });

  it('counts the ones in a period, both ends included', () => {
    expect(workoutDaysBetween(days, day('2026-10-01'), day('2026-10-31'))).toBe(2);
    expect(workoutDaysBetween(days, day('2026-09-30'), day('2026-09-30'))).toBe(1);
    expect(workoutDaysBetween(days, day('2026-11-01'), day('2026-11-30'))).toBe(0);
  });

  it('draws a workout day dark and the rest empty, read out as Workout or No workout', () => {
    // October 2026 (months count from 0), seen on the 2nd.
    const grid = buildMonthGrid(
      { year: 2026, month: 9 },
      { ...workoutDayCells(days), today: day('2026-10-02'), weekStart: 'mon', outlineToday: false },
    );
    const cell = (key: string) => grid.columns.flat().find((c) => c.key === key);

    expect(cell('2026-10-01')).toMatchObject({ level: WORKOUT_DAY_LEVEL, label: 'Oct 1: Workout' });
    expect(cell('2026-10-02')).toMatchObject({ level: 0, label: 'Oct 2: No workout' });
    // A day still to come stays hollow, whatever it holds.
    expect(cell('2026-10-03')).toMatchObject({ level: 0, state: 'future' });
  });

  it('leaves the check-in heatmap as it was', () => {
    const grid = buildMonthGrid(
      { year: 2026, month: 9 },
      { countOn: () => 3, today: day('2026-10-02'), weekStart: 'mon', outlineToday: false },
    );
    expect(grid.columns.flat().find((c) => c.key === '2026-10-01')).toMatchObject({
      level: 2,
      label: 'Oct 1: 3 check-ins',
    });
  });
});
