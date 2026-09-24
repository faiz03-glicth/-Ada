import type { Activity } from '@/features/activities/domain/Activity';
import { ActivityGrid, Card, ListRow } from '@/shared/ui';

import { StepHeading } from './StepHeading';

interface SetupStepProps {
  title: string;
  body: string;
  activities: readonly Activity[];
  selectedIds: readonly string[];
  onToggleActivity: (id: string) => void;
  reminder: { title: string; description: string; enabled: boolean; onToggle: (enabled: boolean) => void };
}

export function SetupStep({
  title,
  body,
  activities,
  selectedIds,
  onToggleActivity,
  reminder,
}: SetupStepProps) {
  return (
    <>
      <StepHeading title={title} body={body} />
      <ActivityGrid
        activities={activities}
        selectedIds={selectedIds}
        selection="multi"
        onToggle={onToggleActivity}
      />
      <Card tight>
        <ListRow
          testID="reminder-row"
          icon="bell"
          iconColor="orange"
          title={reminder.title}
          description={reminder.description}
          trailing="toggle"
          toggleValue={reminder.enabled}
          onToggle={reminder.onToggle}
        />
      </Card>
    </>
  );
}
