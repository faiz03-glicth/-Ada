import { Tabs } from 'expo-router';

import { goTab, openCheckIn } from '@/shared/actions';
import { tabForRouteName } from '@/shared/actions/params';
import { TAB_ITEMS } from '@/shared/config/tabs';
import { TabBar } from '@/shared/ui';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
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
