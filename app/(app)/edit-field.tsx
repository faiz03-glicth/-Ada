import { useLocalSearchParams } from 'expo-router';

import { goBack } from '@/shared/actions';
import { parseEditableField } from '@/shared/actions/params';
import type { EditableField } from '@/shared/actions/types';
import { PhasePlaceholder } from '@/shared/ui';

const TITLES: Record<EditableField, string> = {
  name: 'Name',
  username: 'Username',
  email: 'Email',
  timezone: 'Time zone',
};

/** Form sheet: one editor for name, username, email and time zone. */
export default function EditFieldRoute() {
  const { field } = useLocalSearchParams<{ field: string }>();
  const parsed = parseEditableField(field);
  return <PhasePlaceholder title={parsed ? TITLES[parsed] : 'Edit'} phase={4} onBack={() => goBack()} />;
}
