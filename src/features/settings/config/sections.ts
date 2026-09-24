/** The six settings sections, all rendered by the single settings/[section] route. */
export const SETTINGS_SECTIONS = [
  { id: 'account', title: 'Account' },
  { id: 'appearance', title: 'Appearance' },
  { id: 'notifications', title: 'Notifications' },
  { id: 'activities', title: 'Activity preferences' },
  { id: 'privacy', title: 'Data & privacy' },
  { id: 'about', title: 'About' },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

export function settingsSection(id: SettingsSectionId) {
  return SETTINGS_SECTIONS.find((section) => section.id === id);
}
