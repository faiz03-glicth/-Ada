import { useLocalSearchParams } from 'expo-router';

import { goBack } from '@/shared/actions';
import { parseISODate } from '@/shared/actions/params';
import { PhasePlaceholder } from '@/shared/ui';

/** Form sheet: one day's check-ins. The week strip switches days in place with setParams (Phase 2). */
export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const day = parseISODate(date);
  return <PhasePlaceholder title={day ?? 'Day'} phase={2} onBack={() => goBack()} />;
}
