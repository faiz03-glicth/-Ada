import { useLocalSearchParams } from 'expo-router';

import { DayDetailsSheet } from '@/features/checkins/ui/DayDetailsSheet';
import { parseISODate } from '@/shared/actions/params';

/** Form sheet: one day's check-ins. The week strip switches days in place (setParams). */
export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <DayDetailsSheet date={parseISODate(date)} />;
}
