import { PhasePlaceholder } from '@/shared/ui';

export default function HomeRoute() {
  return (
    <PhasePlaceholder
      title="Home"
      phase={2}
      withTabBar
      body="Your heatmap and today's check-ins arrive in Phase 2."
    />
  );
}
