import { useLocalSearchParams } from 'expo-router';

import { goBack } from '@/shared/actions';
import { parseOptionalId } from '@/shared/actions/params';
import { PhasePlaceholder } from '@/shared/ui';

/** Form sheet: create (no id) or edit (?id=) an activity. */
export default function ActivityEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = parseOptionalId(id) !== undefined;
  return (
    <PhasePlaceholder title={editing ? 'Edit activity' : 'New activity'} phase={4} onBack={() => goBack()} />
  );
}
