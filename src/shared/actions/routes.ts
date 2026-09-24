import type { Href } from 'expo-router';

import type {
  AuthIntent,
  CheckInOptions,
  EditableField,
  HeatmapOptions,
  ISODate,
  OnboardingStep,
  SettingsSectionId,
  Tab,
} from './types';

/** Drops undefined values so optional params never appear as "undefined" in the URL. */
function defined(params: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

/** The ONLY place route paths are written. Every action builds its destination here. */
export const routes = {
  home: (): Href => '/',
  tab: (tab: Tab): Href => (tab === 'home' ? '/' : `/${tab}`),
  heatmap: ({ view, year, month }: HeatmapOptions = {}): Href => ({
    pathname: '/heatmap',
    params: defined({ view, year: year?.toString(), month: month?.toString() }),
  }),
  day: (date: ISODate): Href => ({ pathname: '/day/[date]', params: { date } }),
  checkIn: ({ date, logId }: CheckInOptions = {}): Href => ({
    pathname: '/check-in',
    params: defined({ date, logId }),
  }),
  activityEditor: (id?: string): Href => ({ pathname: '/activity-editor', params: defined({ id }) }),
  settings: (section: SettingsSectionId): Href => ({ pathname: '/settings/[section]', params: { section } }),
  editField: (field: EditableField): Href => ({ pathname: '/edit-field', params: { field } }),
  onboarding: (step: OnboardingStep): Href => ({ pathname: '/onboarding', params: { step: String(step) } }),
  login: (intent: AuthIntent): Href => ({ pathname: '/login', params: { intent } }),
};
