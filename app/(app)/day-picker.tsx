import { useLocalSearchParams } from 'expo-router';

import { DayPickerSheet } from '@/features/calendar/ui/DayPickerSheet';
import { parseDayPickerOptions } from '@/shared/actions/params';

/** Form sheet: choose a day in a month (?year=&month=1–12) on the date wheel. */
export default function DayPickerRoute() {
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
  return <DayPickerSheet options={parseDayPickerOptions(params)} />;
}
