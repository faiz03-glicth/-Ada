import { createFakeCheckInRepository, testCheckIn } from '@test/fakes/fakeCheckIns';
import { createTestQueryClient } from '@test/providers';

import { historyGroups } from '@/features/history/domain/history';
import { buildMonthCalendar, buildMonthGrid, buildWeeksGrid } from '@/features/heatmap/domain/calendarGrid';
import { insightTip, patterns, rangeInsights } from '@/features/insights/domain/insights';
import type { ISODate } from '@/shared/lib/date/isoDate';

import { createCheckInActions } from '../hooks/useCheckInActions';
import { checkInsQueryKey } from '../hooks/useCheckIns';
import { validateNewCheckIn, type CheckIn } from '../domain/CheckIn';
import { countOn, indexCheckIns } from '../domain/checkInIndex';
import { bestStreak, currentStreak, summarize, trend } from '../domain/stats';

const day = (value: string) => value as ISODate;
const TODAY = day('2026-09-24'); // a Thursday
let nextId = 0;
const on = (date: string, minute = 600, activityId = 'workout', note = ''): CheckIn =>
  testCheckIn({ id: `c${(nextId += 1)}`, date: day(date), minute, activityId, note });

describe('check-in index', () => {
  it('groups by day, earliest first, and is shared for the same list', () => {
    const list = [on('2026-09-24', 900), on('2026-09-24', 300), on('2026-09-22')];
    const index = indexCheckIns(list);
    expect(index.byDay.get(day('2026-09-24'))?.map((c) => c.minute)).toEqual([300, 900]);
    expect(index.days).toEqual(['2026-09-24', '2026-09-22']);
    expect(countOn(index, day('2026-09-23'))).toBe(0);
    expect(indexCheckIns(list)).toBe(index);
  });
});

describe('stats', () => {
  const index = indexCheckIns([
    on('2026-09-24'),
    on('2026-09-23'),
    on('2026-09-22'),
    on('2026-09-20'),
    on('2026-09-19'),
    on('2026-09-18'),
    on('2026-09-17'),
  ]);

  it('counts the current streak back from today, or from yesterday when today is still empty', () => {
    expect(currentStreak(index, TODAY)).toBe(3);
    expect(currentStreak(index, day('2026-09-25'))).toBe(3);
    expect(currentStreak(index, day('2026-09-26'))).toBe(0);
  });

  it('finds the best streak ever', () => {
    expect(bestStreak(index)).toBe(4);
  });

  it('summarises a range without counting days after today', () => {
    expect(summarize(index, day('2026-09-21'), day('2026-09-27'), TODAY)).toEqual({
      total: 3,
      activeDays: 3,
      days: 4,
    });
  });

  it('builds a 7-day trend against the average of the days before', () => {
    const t = trend(index, 'D', TODAY, 'mon');
    expect(t.values).toEqual([1, 1, 1, 0, 1, 1, 1]);
    expect(t.labels).toEqual(['F', 'S', 'S', 'M', 'T', 'W', 'T']);
    // 5 check-ins over the 6 days before: 0.83, shown to one decimal; today's 1 is 20% above it.
    expect(t.average).toBe(0.8);
    expect(t.deltaPercent).toBe(20);
  });
});

describe('heatmap grids', () => {
  const options = {
    countOn: (d: ISODate) => (d === TODAY ? 6 : d === day('2026-09-01') ? 2 : 0),
    today: TODAY,
    weekStart: 'mon' as const,
    outlineToday: true,
  };

  it('lays a month out in weeks with leading blanks, future days hollow and today outlined', () => {
    const grid = buildMonthGrid({ year: 2026, month: 8 }, options);
    // 1 Sep 2026 is a Tuesday: one blank (Monday) first.
    expect(grid.columns[0]?.[0]?.state).toBe('blank');
    expect(grid.columns[0]?.[1]).toMatchObject({ key: '2026-09-01', level: 2, label: 'Sep 1: 2 check-ins' });
    const cells = grid.columns.flat();
    expect(cells.find((c) => c.key === TODAY)).toMatchObject({ level: 4, state: 'today' });
    expect(cells.find((c) => c.key === '2026-09-25')?.state).toBe('future');
  });

  it('rings the selected day instead of outlining it', () => {
    const cells = buildMonthGrid({ year: 2026, month: 8 }, { ...options, selected: TODAY }).columns.flat();
    expect(cells.find((c) => c.key === TODAY)?.state).toBe('selected');
  });

  it('pads the month calendar to whole weeks and labels the weeks grid by month', () => {
    const rows = buildMonthCalendar({ year: 2026, month: 8 }, options);
    expect(rows.every((row) => row.length === 7)).toBe(true);
    const weeks = buildWeeksGrid(5, options);
    expect(weeks.grid.columns).toHaveLength(5);
    expect(weeks.monthLabels.filter(Boolean)).toEqual(['Sep']);
  });
});

describe('insights', () => {
  it('compares a period with the same stretch of the one before', () => {
    const index = indexCheckIns([on('2026-09-21'), on('2026-09-24'), on('2026-09-14')]);
    const week = rangeInsights(index, 'week', TODAY, 'mon');
    expect(week).toMatchObject({ total: 2, activeDays: 2, days: 4, dailyAverage: 0.5, deltaPercent: 100 });
    expect(week.values).toEqual([1, 0, 0, 1, 0, 0, 0]);
  });

  it('finds patterns over the last 90 days', () => {
    const index = indexCheckIns([on('2026-09-24', 8 * 60, 'reading'), on('2026-09-24', 19 * 60)]);
    const p = patterns(index, TODAY);
    expect(p.total).toBe(2);
    expect(p.bestWeekday).toBe(4);
    expect(p.byTimeOfDay).toEqual({ morning: 1, afternoon: 0, evening: 1, night: 0 });
    expect(p.daysByLevel).toEqual([89, 0, 1, 0, 0]);
    expect(p.byActivity.slice(0, 2).map((a) => a.count)).toEqual([1, 1]);
  });

  it('writes a tip from the streak and today', () => {
    expect(insightTip(3, 4)).toBe('Your streak is 3 days. 2 more check-ins today make it a Peak day.');
    expect(insightTip(0, 0)).toMatch(/^Check in today to start a streak/);
    expect(insightTip(1, 6)).toBe('Your streak is 1 day. Today is already a Peak day.');
  });
});

describe('history', () => {
  const index = indexCheckIns([
    on('2026-09-24', 600, 'reading', 'Chapter 4'),
    on('2026-09-24', 700, 'workout'),
    on('2026-09-22', 600, 'walk', 'Evening walk'),
  ]);

  it('groups latest day first, latest check-in first, keeping the whole day count', () => {
    const groups = historyGroups(index, 'all', '');
    expect(groups.map((g) => g.day)).toEqual(['2026-09-24', '2026-09-22']);
    expect(groups[0]?.items.map((c) => c.minute)).toEqual([700, 600]);
  });

  it('filters by activity and searches names and notes in any case', () => {
    expect(historyGroups(index, 'walk', '').map((g) => g.day)).toEqual(['2026-09-22']);
    const found = historyGroups(index, 'all', 'CHAPTER');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ count: 2 });
    expect(historyGroups(index, 'all', 'workout')[0]?.items).toHaveLength(1);
    expect(historyGroups(index, 'all', 'nothing like this')).toEqual([]);
  });
});

describe('validation', () => {
  const input = { date: TODAY, minute: 600, activityId: 'workout', note: '  Leg day  ' };

  it('trims the note and accepts a past time today', () => {
    expect(validateNewCheckIn(input, TODAY, 700)).toEqual({ ok: true, value: { ...input, note: 'Leg day' } });
  });

  it('rejects the future and unknown activities', () => {
    expect(validateNewCheckIn({ ...input, date: day('2026-09-25') }, TODAY, 700)).toEqual({
      ok: false,
      problem: 'futureDay',
    });
    expect(validateNewCheckIn(input, TODAY, 500)).toEqual({ ok: false, problem: 'invalidTime' });
    expect(validateNewCheckIn({ ...input, activityId: 'nope' }, TODAY, 700)).toMatchObject({ ok: false });
  });
});

describe('check-in actions', () => {
  const setup = (seed: CheckIn[] = []) => {
    const repository = createFakeCheckInRepository(seed);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(checkInsQueryKey('user-1'), seed);
    const toast = { success: jest.fn(), info: jest.fn() };
    const pulse = jest.fn();
    const confirm = jest.fn(async () => true);
    const actions = createCheckInActions({
      repository,
      owner: 'user-1',
      queryClient,
      now: () => new Date(2026, 8, 24, 20, 0),
      confirm,
      toast,
      pulse,
    });
    const cached = () => queryClient.getQueryData<CheckIn[]>(checkInsQueryKey('user-1')) ?? [];
    return { repository, actions, cached, toast, pulse, confirm };
  };
  const input = { date: TODAY, minute: 600, activityId: 'workout', note: '' };

  it('saves, updates the cache and pulses the day; the toast offers Undo', async () => {
    const { actions, cached, pulse, toast } = setup();
    const result = await actions.save(input);
    expect(result.ok).toBe(true);
    expect(cached()).toHaveLength(1);
    expect(pulse).toHaveBeenCalledWith(TODAY);
    if (!result.ok) return;
    actions.announce(result.checkIn);
    expect(toast.success).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Checked in · Workout', sub: 'Today now has 1 check-in · Light' }),
    );
    await toast.success.mock.calls[0][0].undo();
    expect(cached()).toHaveLength(0);
  });

  it("keeps everything as it was when saving fails, and doesn't announce", async () => {
    const { actions, repository, cached, pulse } = setup();
    repository.add.mockRejectedValueOnce(new Error('disk full'));
    const result = await actions.save(input);
    expect(result).toEqual({ ok: false, message: expect.stringContaining("Couldn't save") });
    expect(cached()).toHaveLength(0);
    expect(pulse).not.toHaveBeenCalled();
  });

  it('repeats the last activity now, and deletes everything after confirmation', async () => {
    const { actions, cached, confirm } = setup([on('2026-09-23', 600, 'reading')]);
    const repeated = await actions.repeatLast();
    expect(repeated).toMatchObject({
      ok: true,
      checkIn: { activityId: 'reading', date: TODAY, minute: 1200 },
    });
    await actions.deleteAll();
    expect(confirm).toHaveBeenCalled();
    expect(cached()).toEqual([]);
  });
});
