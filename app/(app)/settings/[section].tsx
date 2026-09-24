import { useLocalSearchParams } from 'expo-router';

import { settingsSection } from '@/features/settings/config/sections';
import { AppearanceSettingsScreen } from '@/features/settings/ui/appearance/AppearanceSettingsScreen';
import { goBack } from '@/shared/actions';
import { parseSettingsSection } from '@/shared/actions/params';
import { PhasePlaceholder } from '@/shared/ui';

/** One route for all six settings sections, driven by the section registry. */
export default function SettingsSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const id = parseSettingsSection(section);
  if (id === 'appearance') return <AppearanceSettingsScreen />;
  const title = (id && settingsSection(id)?.title) ?? 'Settings';
  return <PhasePlaceholder title={title} phase={4} onBack={() => goBack()} />;
}
