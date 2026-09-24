import { Stack } from 'expo-router';

import { BootGate } from '@/core/bootstrap/BootGate';
import { AppProviders } from '@/core/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <BootGate>
        <Stack screenOptions={{ headerShown: false }} />
      </BootGate>
    </AppProviders>
  );
}
