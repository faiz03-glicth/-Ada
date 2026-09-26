import { createFakeCheckInRepository, testCheckIn } from '@test/fakes/fakeCheckIns';
import { createFakeRepositories } from '@test/fakes/fakeRepositories';

import type { CheckIn } from '@/features/checkins/domain/CheckIn';
import { addDays } from '@/shared/lib/date/calendar';
import { toISODate, type ISODate } from '@/shared/lib/date/isoDate';

/** Today, as the screens see it (they read the real clock). */
export const today = (): ISODate => toISODate(new Date());
export const daysAgo = (days: number): ISODate => addDays(today(), -days);

let next = 0;
/** A check-in `days` ago, early in the day (so "today" check-ins are never in the future). */
export function checkInDaysAgo(days: number, overrides: Partial<CheckIn> = {}): CheckIn {
  next += 1;
  return testCheckIn({
    id: `seed-${next}`,
    date: daysAgo(days),
    minute: 5 + (next % 50),
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, next)).toISOString(),
    ...overrides,
  });
}

/** Fake repositories holding these check-ins for the signed-in test user. */
export function repositoriesWith(checkIns: CheckIn[]) {
  return createFakeRepositories(createFakeCheckInRepository(checkIns, 'user-1'));
}
