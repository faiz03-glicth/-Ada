import { Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

/** Tabs, pushed screens, and native form sheets. */
export default function AppLayout() {
  const { theme } = useUnistyles();
  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetCornerRadius: theme.radii.sheet,
    contentStyle: { backgroundColor: theme.colors.surface },
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.canvas } }}>
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
