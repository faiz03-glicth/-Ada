import { goBack } from '@/shared/actions';
import { PhasePlaceholder } from '@/shared/ui';

export default function LoginRoute() {
  return <PhasePlaceholder title="Log in" phase={1} onBack={() => goBack()} />;
}
