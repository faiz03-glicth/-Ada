import { useLocalSearchParams } from 'expo-router';

import { EditNameSheet } from '@/features/settings/ui/account/EditNameSheet';
import { goBack } from '@/shared/actions';
import { parseEditableField } from '@/shared/actions/params';
import { SheetLayout, Text } from '@/shared/ui';

/** Form sheet: edit one profile field. Only the name is editable today; others explain why not. */
export default function EditFieldRoute() {
  const { field } = useLocalSearchParams<{ field: string }>();
  if (parseEditableField(field) === 'name') return <EditNameSheet />;
  return (
    <SheetLayout title="Not editable yet" onClose={() => goBack()}>
      <Text variant="sub" tone="secondary">
        This comes from how you sign in, so it can&apos;t be changed in Streak yet.
      </Text>
    </SheetLayout>
  );
}
