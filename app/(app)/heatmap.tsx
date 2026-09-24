import { useLocalSearchParams } from 'expo-router';

import { goBack } from '@/shared/actions';
import { parseHeatmapOptions } from '@/shared/actions/params';
import { PhasePlaceholder } from '@/shared/ui';

export default function HeatmapRoute() {
  const params = useLocalSearchParams<{ view?: string; year?: string; month?: string }>();
  const { view } = parseHeatmapOptions(params);
  return (
    <PhasePlaceholder
      title={view === 'month' ? 'Month' : 'Year'}
      phase={2}
      onBack={() => goBack()}
      body="The full-year and month heatmaps arrive in Phase 2."
    />
  );
}
