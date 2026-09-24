import { Stack } from 'expo-router';

import { BootGate } from '@/core/bootstrap/BootGate';
import { AppProviders } from '@/core/providers/AppProviders';
import { AppToaster } from '@/shared/ui';

export default function RootLayout() {
  return (
    <AppProviders>
      <BootGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(auth)" />
        </Stack>
        <AppToaster />
      </BootGate>
    </AppProviders>
  );
}
