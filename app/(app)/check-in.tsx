import { useLocalSearchParams } from 'expo-router';

import { CheckInSheet } from '@/features/checkins/ui/CheckInSheet';
import { parseISODate, parseOptionalId } from '@/shared/actions/params';

/** Form sheet: a new check-in, optionally for a given day (?date=) and activity (?activityId=). */
export default function CheckInRoute() {
  const { date, activityId } = useLocalSearchParams<{ date?: string; activityId?: string }>();
  return <CheckInSheet date={parseISODate(date)} activityId={parseOptionalId(activityId)} />;
}
