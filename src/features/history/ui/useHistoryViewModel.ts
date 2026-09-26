import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { ACTIVITIES } from '@/features/activities/domain/catalog';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { openCheckIn, openDay } from '@/shared/actions';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { haptics } from '@/shared/lib/haptics';

import { ALL_ACTIVITIES, historyGroups, type HistoryFilter } from '../domain/history';

export const FILTER_OPTIONS: readonly { value: HistoryFilter; label: string }[] = [
  { value: ALL_ACTIVITIES, label: 'All' },
  ...ACTIVITIES.map((activity) => ({ value: activity.id, label: activity.name })),
];

/**
 * History: every check-in, grouped by day, searchable (activities and notes) and filterable by activity.
 * The search box updates as you type; the list follows as a low-priority update (useDeferredValue), so
 * typing never waits for a long list to filter. Only this screen re-renders while searching.
 */
export function useHistoryViewModel() {
  const { index, loading } = useCheckIns();
  const today = useToday();
  const [filter, setFilter] = useState<HistoryFilter>(ALL_ACTIVITIES);
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query);
  const groups = useMemo(() => historyGroups(index, filter, search), [index, filter, search]);

  const onDayPress = useCallback((day: ISODate) => openDay(day), []);

  return {
    loading,
    empty: !loading && index.total === 0,
    today,
    groups,
    query,
    filter,
    filterOptions: FILTER_OPTIONS,
    noMatchText: search.trim()
      ? `No check-ins match “${search.trim()}”.`
      : 'No check-ins for this activity yet.',

    onQuery: setQuery,
    onFilter: (next: HistoryFilter) => {
      haptics.selection();
      setFilter(next);
    },
    onDayPress,
    onAdd: () => openCheckIn(),
  };
}

export type HistoryViewModel = ReturnType<typeof useHistoryViewModel>;
