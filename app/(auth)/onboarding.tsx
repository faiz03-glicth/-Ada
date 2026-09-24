import { goBack } from '@/shared/actions';
import { PhasePlaceholder } from '@/shared/ui';

export default function OnboardingRoute() {
  return <PhasePlaceholder title="Onboarding" phase={1} onBack={() => goBack()} />;
}
