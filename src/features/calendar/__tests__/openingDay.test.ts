import { indexCheckIns } from '@/features/checkins/domain/checkInIndex';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { testCheckIn } from '@test/fakes/fakeCheckIns';

import { daysSoFar, openingDay } from '../domain/openingDay';
import { chosenDayMemory } from '../state/chosenDayMemory';

const d = (day: string) => day as ISODate;
const august = { year: 2026, month: 7 }; // YearMonth months are 0-based
const index = indexCheckIns([testCheckIn({ id: 'x', date: d('2026-08-02') })]);
const none = indexCheckIns([]);

describe('daysSoFar', () => {
  it("lists a month's days up to today, never beyond", () => {
    expect(daysSoFar(august, d('2026-09-26'))).toHaveLength(31);
    expect(daysSoFar(august, d('2026-08-03'))).toEqual([d('2026-08-01'), d('2026-08-02'), d('2026-08-03')]);
    expect(daysSoFar(august, d('2026-08-01'))).toEqual([d('2026-08-01')]);
  });
});

describe('openingDay', () => {
  it('prefers the remembered day, then today, then the latest check-in, then the last day', () => {
    expect(openingDay(august, d('2026-09-26'), index, d('2026-08-01'))).toBe('2026-08-01');
    expect(openingDay(august, d('2026-08-03'), index, undefined)).toBe('2026-08-03');
    expect(openingDay(august, d('2026-09-26'), index, undefined)).toBe('2026-08-02');
    expect(openingDay(august, d('2026-09-26'), none, undefined)).toBe('2026-08-31');
  });

  it('never opens on a day outside the month or still to come', () => {
    // Remembered from another month, or later than today: skipped.
    expect(openingDay(august, d('2026-09-26'), none, d('2026-07-31'))).toBe('2026-08-31');
    expect(openingDay(august, d('2026-08-03'), none, d('2026-08-20'))).toBe('2026-08-03');
    // The first of the month: the one day there is so far.
    expect(openingDay(august, d('2026-08-01'), none, undefined)).toBe('2026-08-01');
  });
});

describe('chosenDayMemory', () => {
  beforeEach(() => chosenDayMemory.clear());

  it('remembers the last day chosen in each month, for the session', () => {
    chosenDayMemory.set(d('2026-08-12'));
    chosenDayMemory.set(d('2026-09-03'));
    chosenDayMemory.set(d('2026-08-14'));
    expect(chosenDayMemory.get(august)).toBe('2026-08-14');
    expect(chosenDayMemory.get({ year: 2026, month: 8 })).toBe('2026-09-03');
    expect(chosenDayMemory.get({ year: 2025, month: 7 })).toBeUndefined();
  });
});
