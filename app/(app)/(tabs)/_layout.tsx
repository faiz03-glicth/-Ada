import { Tabs } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { goTab, openCheckIn } from '@/shared/actions';
import { tabForRouteName } from '@/shared/actions/params';
import { TAB_ITEMS } from '@/shared/config/tabs';
import { TabBar } from '@/shared/ui';
import { useNavigationMotion } from '@/theme';

export default function TabsLayout() {
  const transitions = useNavigationMotion();
  const { theme } = useUnistyles();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Tabs cross-fade over the canvas colour, so nothing lighter shows through mid-transition.
        animation: transitions.tabs,
        sceneStyle: { backgroundColor: theme.colors.canvas },
      }}
      tabBar={({ state }) => (
        <TabBar
          items={TAB_ITEMS}
          active={tabForRouteName(state.routes[state.index]?.name)}
          onTabPress={goTab}
          onFabPress={() => openCheckIn()}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
