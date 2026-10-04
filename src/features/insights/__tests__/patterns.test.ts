import { testCheckIn } from '@test/fakes/fakeCheckIns';

import type { CheckIn } from '@/features/checkins/domain/CheckIn';
import { indexCheckIns } from '@/features/checkins/domain/checkInIndex';
import { addDays } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { patterns, PATTERN_DAYS } from '../domain/insights';

const TODAY = '2026-10-05' as ISODate;
let nextId = 0;
const daysAgo = (days: number): CheckIn =>
  testCheckIn({
    id: `p${(nextId += 1)}`,
    date: addDays(TODAY, -days),
    minute: 600,
    activityId: 'walk',
    note: '',
  });

describe('Insights patterns', () => {
  it('judges someone who just started on the days since their first check-in', () => {
    const p = patterns(indexCheckIns(Array.from({ length: 10 }, (_, i) => daysAgo(i))), TODAY);
    expect(p.days).toBe(10);
    // Every day since they started: 100%, not 11% of 90 days.
    expect(p.activePercent).toBe(100);
    expect(p.daysByLevel[0]).toBe(0);
  });

  it('looks back no further than the pattern window for a long history', () => {
    const p = patterns(indexCheckIns([daysAgo(200), daysAgo(0)]), TODAY);
    expect(p.days).toBe(PATTERN_DAYS);
    expect(p.total).toBe(1);
    expect(p.activePercent).toBe(1);
  });

  it('names no best weekday when nothing was logged in the window', () => {
    const p = patterns(indexCheckIns(Array.from({ length: 8 }, (_, i) => daysAgo(200 + i))), TODAY);
    expect(p.total).toBe(0);
    expect(p.bestWeekday).toBeNull();
    expect(p.activePercent).toBe(0);
  });
});
