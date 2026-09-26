import { Tabs } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useFabActions } from '@/features/checkins/hooks/useFabActions';
import { goTab } from '@/shared/actions';
import { tabForRouteName } from '@/shared/actions/params';
import { TAB_ITEMS, type TabId } from '@/shared/config/tabs';
import { BlurTarget, TabBar } from '@/shared/ui';
import { useNavigationMotion } from '@/theme';

const NO_TAB_BAR = () => null;

/**
 * The four tabs and the footer. The footer is drawn beside the navigator rather than by it, so the tab
 * screens can sit inside a BlurTarget that the Liquid Glass footer frosts (a blur can't include itself).
 * Which tab is active still comes from navigation: each tab screen reports when it gains focus.
 */
export default function TabsLayout() {
  const transitions = useNavigationMotion();
  const { theme } = useUnistyles();
  const fab = useFabActions();
  const target = useRef<View | null>(null);
  const [active, setActive] = useState<TabId>('home');
  const screenListeners = useCallback(
    ({ route }: { route: { name: string } }) => ({ focus: () => setActive(tabForRouteName(route.name)) }),
    [],
  );

  return (
    <View style={styles.root}>
      <BlurTarget targetRef={target} style={styles.root}>
        <Tabs
          screenOptions={{
            headerShown: false,
            // Tabs cross-fade over the canvas colour, so nothing lighter shows through mid-transition.
            animation: transitions.tabs,
            sceneStyle: { backgroundColor: theme.colors.canvas },
          }}
          screenListeners={screenListeners}
          tabBar={NO_TAB_BAR}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="insights" />
          <Tabs.Screen name="history" />
          <Tabs.Screen name="profile" />
        </Tabs>
      </BlurTarget>
      <TabBar
        items={TAB_ITEMS}
        active={active}
        onTabPress={goTab}
        onFabPress={fab.onPress}
        onFabLongPress={() => void fab.onLongPress()}
        blurTarget={target}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
