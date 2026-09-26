import { useLocalSearchParams } from 'expo-router';

import { CalendarScreen } from '@/features/calendar/ui/CalendarScreen';
import { parseHeatmapOptions } from '@/shared/actions/params';

/** The full heatmap: ?view=year|month&year=&month= (the screen keeps its own place after opening). */
export default function HeatmapRoute() {
  const params = useLocalSearchParams<{ view?: string; year?: string; month?: string }>();
  return <CalendarScreen options={parseHeatmapOptions(params)} />;
}
