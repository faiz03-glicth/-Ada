import { Tabs } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { useFabActions } from '@/features/checkins/hooks/useFabActions';
import { goTab } from '@/shared/actions';
import { tabForRouteName } from '@/shared/actions/params';
import { TAB_ITEMS } from '@/shared/config/tabs';
import { TabBar } from '@/shared/ui';
import { useNavigationMotion } from '@/theme';

export default function TabsLayout() {
  const transitions = useNavigationMotion();
  const { theme } = useUnistyles();
  const fab = useFabActions();
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
          onFabPress={fab.onPress}
          onFabLongPress={() => void fab.onLongPress()}
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
