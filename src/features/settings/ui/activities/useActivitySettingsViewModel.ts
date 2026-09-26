import { useMemo } from 'react';

import { ACTIVITIES } from '@/features/activities/domain/catalog';
import {
  MAX_DAILY_GOAL,
  MIN_DAILY_GOAL,
  useActivityPreferencesStore,
} from '@/features/activities/state/activityPreferencesStore';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';
import { showInfo } from '@/shared/ui/toast';

/** Activity preferences: the daily goal, and each activity with how often it has been logged. */
export function useActivitySettingsViewModel() {
  const goal = useActivityPreferencesStore((s) => s.dailyGoal);
  const setGoal = useActivityPreferencesStore((s) => s.setDailyGoal);
  const { index } = useCheckIns();

  const activities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const checkIns of index.byDay.values()) {
      for (const checkIn of checkIns) {
        counts.set(checkIn.activityId, (counts.get(checkIn.activityId) ?? 0) + 1);
      }
    }
    return ACTIVITIES.map((activity) => ({ activity, count: counts.get(activity.id) ?? 0 }));
  }, [index]);

  const change = (by: number) => {
    const next = Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, goal + by));
    if (next === goal) return;
    haptics.selection();
    setGoal(next);
  };

  return {
    goal,
    minGoal: MIN_DAILY_GOAL,
    maxGoal: MAX_DAILY_GOAL,
    goalSteps: Array.from({ length: MAX_DAILY_GOAL }, (_, i) => i + 1),
    activities,
    onDecrease: () => change(-1),
    onIncrease: () => change(1),
    onAddActivity: () =>
      showInfo({ title: 'Custom activities are coming', sub: 'For now, Streak has six activities.' }),
    onBack: () => goBack(),
  };
}
