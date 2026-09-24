import type { IconName } from '../ui/icons';

export type TabId = 'home' | 'insights' | 'history' | 'profile';

export interface TabItem {
  id: TabId;
  label: string;
  icon: IconName;
}

/** Tab order: two tabs, the centre FAB, two tabs. */
export const TAB_ITEMS: readonly TabItem[] = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'history', label: 'History', icon: 'list' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];
