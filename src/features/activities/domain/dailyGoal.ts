import { checkInCount } from '@/shared/lib/format/dates';

/** How one day's check-ins measure up to the daily goal (Settings → Activity preferences). */
export interface DailyGoalProgress {
  /** At least as many check-ins as the goal. */
  met: boolean;
  /** Home's today line: "2 of 4 check-ins", then "5 check-ins · Goal met". */
  line: string;
  /** The Day sheet's pill: "Goal · 2 of 4", then "Goal met". */
  pill: string;
  /** For screen readers: "2 of 4 check-ins", then "5 check-ins, daily goal met". */
  spoken: string;
}

export function dailyGoalProgress(count: number, goal: number): DailyGoalProgress {
  if (count >= goal) {
    return {
      met: true,
      line: `${checkInCount(count)} · Goal met`,
      pill: 'Goal met',
      spoken: `${checkInCount(count)}, daily goal met`,
    };
  }
  const progress = `${count} of ${checkInCount(goal)}`;
  return { met: false, line: progress, pill: `Goal · ${count} of ${goal}`, spoken: progress };
}
