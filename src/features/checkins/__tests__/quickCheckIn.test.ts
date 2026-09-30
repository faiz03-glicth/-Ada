import type { ISODate } from '@/shared/lib/date/isoDate';
import { testCheckIn } from '@test/fakes/fakeCheckIns';

import { OTHER_DAY_MINUTE, quickCheckInMinute, startingActivityId } from '../domain/CheckIn';

const d = (day: string) => day as ISODate;

it('logs today at the current minute and any earlier day at midday', () => {
  const now = new Date(2026, 8, 30, 14, 5);
  expect(quickCheckInMinute(d('2026-09-30'), d('2026-09-30'), now)).toBe(14 * 60 + 5);
  expect(quickCheckInMinute(d('2026-09-12'), d('2026-09-30'), now)).toBe(OTHER_DAY_MINUTE);
  expect(OTHER_DAY_MINUTE).toBe(12 * 60);
});

it('starts on the last activity logged, else the first one picked in setup, else the first activity', () => {
  expect(startingActivityId(testCheckIn({ activityId: 'walk' }), ['reading'])).toBe('walk');
  expect(startingActivityId(null, ['reading'])).toBe('reading');
  expect(startingActivityId(null, [])).toBe('workout');
});
