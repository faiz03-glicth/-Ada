import { dailyGoalProgress } from '../dailyGoal';

describe('dailyGoalProgress', () => {
  it('counts towards the goal until it is reached', () => {
    expect(dailyGoalProgress(2, 4)).toEqual({
      met: false,
      line: '2 of 4 check-ins',
      pill: 'Goal · 2 of 4',
      spoken: '2 of 4 check-ins',
    });
  });

  it('starts from nothing, and says "check-in" for a goal of one', () => {
    expect(dailyGoalProgress(0, 1)).toMatchObject({
      met: false,
      line: '0 of 1 check-in',
      pill: 'Goal · 0 of 1',
    });
  });

  it('is met at the goal exactly', () => {
    expect(dailyGoalProgress(4, 4)).toEqual({
      met: true,
      line: '4 check-ins · Goal met',
      pill: 'Goal met',
      spoken: '4 check-ins, daily goal met',
    });
  });

  it('stays met past the goal, and counts every check-in', () => {
    expect(dailyGoalProgress(7, 4)).toMatchObject({ met: true, line: '7 check-ins · Goal met' });
    expect(dailyGoalProgress(1, 1)).toMatchObject({ met: true, line: '1 check-in · Goal met' });
  });
});
