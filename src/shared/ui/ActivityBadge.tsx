import { useUnistyles } from 'react-native-unistyles';

import type { Activity } from '@/features/activities/domain/Activity';

import { IconBadge } from './IconBadge';

export interface ActivityBadgeProps {
  activity: Pick<Activity, 'icon' | 'color'>;
  size?: number;
}

export function ActivityBadge({ activity, size = 40 }: ActivityBadgeProps) {
  const { theme } = useUnistyles();
  return <IconBadge icon={activity.icon} color={theme.activity[activity.color]} size={size} />;
}
