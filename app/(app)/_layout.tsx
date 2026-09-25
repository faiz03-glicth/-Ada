import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { useNavigationMotion } from '@/theme';

/** Tabs, pushed screens (sliding in from the right), and native form sheets. */
export default function AppLayout() {
  const { theme } = useUnistyles();
  const transitions = useNavigationMotion();
  const sheet = {
    presentation: 'formSheet',
    // Sheets keep the platform's own slide-up, not the push slide.
    animation: 'default',
    sheetGrabberVisible: true,
    sheetCornerRadius: theme.radii.sheet,
    contentStyle: { backgroundColor: theme.colors.surface },
  } as const;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: transitions.push,
        animationDuration: transitions.fadeMs,
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="heatmap" />
      <Stack.Screen name="settings/[section]" />
      <Stack.Screen name="check-in" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
      <Stack.Screen name="day/[date]" options={{ ...sheet, sheetAllowedDetents: [0.6, 0.95] }} />
      <Stack.Screen name="activity-editor" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
      <Stack.Screen name="edit-field" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
    </Stack>
  );
}
