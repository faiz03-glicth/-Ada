import { useLocalSearchParams } from 'expo-router';

import { DaySheet } from '@/features/calendar/ui/DaySheet';
import { parseISODate } from '@/shared/actions/params';

/** Form sheet: a day on its month's date wheel, with its check-ins and Check in (see DaySheet). */
export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <DaySheet date={parseISODate(date)} />;
}
