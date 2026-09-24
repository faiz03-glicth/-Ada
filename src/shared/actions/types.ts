import type { ISODate } from '../lib/date/isoDate';

export type { AuthIntent } from '@/features/auth/domain/types';
export type { SettingsSectionId } from '@/features/settings/config/sections';
export type { TabId as Tab } from '../config/tabs';
export type { ISODate } from '../lib/date/isoDate';

export type HeatmapView = 'year' | 'month';
export type OnboardingStep = 0 | 1 | 2;

export const EDITABLE_FIELDS = ['name', 'username', 'email', 'timezone'] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

export const LEGAL_DOCS = ['terms', 'privacy', 'acknowledgements'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

export interface HeatmapOptions {
  view?: HeatmapView;
  year?: number;
  /** 1–12 */
  month?: number;
}

export interface CheckInOptions {
  /** Pre-select a day (create). */
  date?: ISODate;
  /** Edit an existing check-in. */
  logId?: string;
}
