import { Stack } from 'expo-router';

import { useRouteGuards } from '@/features/auth/hooks/useRouteGuards';

/**
 * Where the auth group opens:
 * - first launch → Welcome (onboarding step 0)
 * - signed in or guest but onboarding unfinished (e.g. app killed mid-setup) → onboarding step 1
 * - signed out after onboarding (e.g. after "Log out") → Login, returning-user variant
 */
export default function AuthLayout() {
  const { hasCompletedOnboarding, inSession } = useRouteGuards();
  return (
    <Stack
      initialRouteName={hasCompletedOnboarding ? 'login' : 'onboarding'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="onboarding" initialParams={{ step: inSession ? '1' : '0' }} />
      <Stack.Screen name="login" initialParams={{ intent: hasCompletedOnboarding ? 'existing' : 'new' }} />
    </Stack>
  );
}
