import { Stack } from 'expo-router';

import { BootGate } from '@/core/bootstrap/BootGate';
import { AppProviders } from '@/core/providers/AppProviders';
import { RepositoriesProvider } from '@/core/RepositoriesProvider';
import { useAuthAutoRefresh } from '@/core/supabase/useAuthAutoRefresh';
import { useRouteGuards } from '@/features/auth/hooks/useRouteGuards';
import { SessionGate } from '@/features/auth/ui/SessionGate';
import { AppToaster } from '@/shared/ui';

/** Exactly one group is reachable at a time; the guards move people between them. */
function RootNavigator() {
  useAuthAutoRefresh();
  const { canEnterApp, canEnterAuth } = useRouteGuards();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={canEnterApp}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={canEnterAuth}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <BootGate>
        <RepositoriesProvider>
          <SessionGate>
            <RootNavigator />
            <AppToaster />
          </SessionGate>
        </RepositoriesProvider>
      </BootGate>
    </AppProviders>
  );
}
