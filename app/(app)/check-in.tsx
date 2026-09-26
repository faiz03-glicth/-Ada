import { useLocalSearchParams } from 'expo-router';

import { CheckInSheet } from '@/features/checkins/ui/CheckInSheet';
import { parseISODate } from '@/shared/actions/params';

/** Form sheet: a new check-in, optionally for a given day (?date=). */
export default function CheckInRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <CheckInSheet date={parseISODate(date)} />;
}
