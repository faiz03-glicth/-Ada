import { useLocalSearchParams } from 'expo-router';

import { goBack } from '@/shared/actions';
import { parseOptionalId } from '@/shared/actions/params';
import { PhasePlaceholder } from '@/shared/ui';

/** Form sheet: create (optionally ?date=) or edit (?logId=) a check-in. */
export default function CheckInRoute() {
  const { logId } = useLocalSearchParams<{ date?: string; logId?: string }>();
  const editing = parseOptionalId(logId) !== undefined;
  return (
    <PhasePlaceholder title={editing ? 'Edit check-in' : 'Check in'} phase={2} onBack={() => goBack()} />
  );
}
