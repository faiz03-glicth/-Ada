import { useLocalSearchParams } from 'expo-router';

import { AboutSettingsScreen } from '@/features/settings/ui/about/AboutSettingsScreen';
import { AccountSettingsScreen } from '@/features/settings/ui/account/AccountSettingsScreen';
import { ActivitySettingsScreen } from '@/features/settings/ui/activities/ActivitySettingsScreen';
import { AppearanceSettingsScreen } from '@/features/settings/ui/appearance/AppearanceSettingsScreen';
import { NotificationsSettingsScreen } from '@/features/settings/ui/notifications/NotificationsSettingsScreen';
import { PrivacySettingsScreen } from '@/features/settings/ui/privacy/PrivacySettingsScreen';
import { goBack } from '@/shared/actions';
import { parseSettingsSection } from '@/shared/actions/params';
import { EmptyState, NavBar, Screen } from '@/shared/ui';

/** One route for all six settings sections, driven by the section registry. */
export default function SettingsSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  switch (parseSettingsSection(section)) {
    case 'account':
      return <AccountSettingsScreen />;
    case 'appearance':
      return <AppearanceSettingsScreen />;
    case 'notifications':
      return <NotificationsSettingsScreen />;
    case 'activities':
      return <ActivitySettingsScreen />;
    case 'privacy':
      return <PrivacySettingsScreen />;
    case 'about':
      return <AboutSettingsScreen />;
    default:
      return (
        <Screen>
          <NavBar title="Settings" onBack={() => goBack()} />
          <EmptyState icon="alert" title="This setting doesn't exist" body="Go back to Profile to find it." />
        </Screen>
      );
  }
}
