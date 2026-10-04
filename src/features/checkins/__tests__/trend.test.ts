import { testCheckIn } from '@test/fakes/fakeCheckIns';

import { addDays } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';

import type { CheckIn } from '../domain/CheckIn';
import { indexCheckIns } from '../domain/checkInIndex';
import { trend } from '../domain/stats';

const day = (value: string) => value as ISODate;
const at = (hours: number) => hours * 60;
let nextId = 0;
const on = (date: ISODate, minute: number): CheckIn =>
  testCheckIn({ id: `t${(nextId += 1)}`, date, minute, activityId: 'workout', note: '' });

describe('Home trend', () => {
  it('judges this week so far against the same days of earlier weeks, not whole weeks', () => {
    // Monday 5 Oct 2026 at 8 AM. Every earlier week: Monday 7 AM, Tuesday and Wednesday 10 AM.
    const today = day('2026-10-05');
    const list: CheckIn[] = [on(today, at(7.5))];
    for (let week = 1; week <= 11; week += 1) {
      const monday = addDays(today, -7 * week);
      list.push(on(monday, at(7)), on(addDays(monday, 1), at(10)), on(addDays(monday, 2), at(10)));
    }

    const t = trend(indexCheckIns(list), 'W', today, 'mon', at(8));

    expect(t.values.at(-1)).toBe(1);
    expect(t.average).toBe(3);
    // One so far, as on every earlier Monday by 8 AM: no change (it read −67% against whole weeks).
    expect(t.deltaPercent).toBe(0);
  });

  it('judges today against the same hours of earlier days, with an average that is not rounded away', () => {
    const today = day('2026-10-05');
    const list = [
      on(addDays(today, -3), at(10)),
      on(addDays(today, -5), at(10)),
      on(today, at(6)),
      on(today, at(6)),
      on(today, at(6)),
    ];
    const index = indexCheckIns(list);

    const noon = trend(index, 'D', today, 'mon', at(12));
    // 2 check-ins over 6 days: 0.3 a day (it read 0, and the comparison was hidden).
    expect(noon.average).toBe(0.3);
    expect(noon.deltaPercent).toBe(800);

    // At 9 AM the earlier days had nothing yet: nothing to compare against.
    expect(trend(index, 'D', today, 'mon', at(9)).deltaPercent).toBeNull();
  });

  it('has nothing to compare against before there are earlier check-ins', () => {
    const today = day('2026-10-05');
    const t = trend(indexCheckIns([on(today, at(6))]), 'M', today, 'mon', at(12));
    expect(t.average).toBe(0);
    expect(t.deltaPercent).toBeNull();
  });

  it('counts a shorter month whole when this month is past its last day', () => {
    // 31 March at 10 AM. February ends on the 28th, so all of it counts; January stops at 10 AM on the 31st.
    const today = day('2026-03-31');
    const list = [on(day('2026-02-28'), at(23)), on(day('2026-01-31'), at(23)), on(today, at(9))];

    const t = trend(indexCheckIns(list), 'M', today, 'mon', at(10));

    expect(t.labels).toEqual(['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']);
    // Earlier stretches: 0, 0, 0, 0, 1 → 0.2 a month; 1 so far is 400% above it.
    expect(t.deltaPercent).toBe(400);
  });
});
