import { goBack } from '@/shared/actions';
import { SheetLayout, Text } from '@/shared/ui';

/** Form sheet: custom activities aren't available yet; the six built-in activities are the whole list. */
export default function ActivityEditorRoute() {
  return (
    <SheetLayout title="Custom activities are coming" onClose={() => goBack()}>
      <Text variant="sub" tone="secondary">
        For now, Streak has six activities. Every one counts toward the same heatmap.
      </Text>
    </SheetLayout>
  );
}
