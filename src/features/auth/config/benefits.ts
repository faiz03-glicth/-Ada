import type { ActivityColorKey } from '@/theme';
import type { IconName } from '@/shared/ui/icons';

export interface Benefit {
  icon: IconName;
  color: ActivityColorKey;
  title: string;
  description: string;
}

/** Why an account helps, shown on Login. */
export const LOGIN_BENEFITS: readonly Benefit[] = [
  {
    icon: 'upload',
    color: 'blue',
    title: 'Sync across devices',
    description: 'iPhone, iPad and Android stay up to date',
  },
  {
    icon: 'shield',
    color: 'teal',
    title: 'Every check-in backed up',
    description: 'Change phones without losing your streak',
  },
  { icon: 'lock', color: 'purple', title: 'Private by default', description: 'Your notes are never shared' },
];
