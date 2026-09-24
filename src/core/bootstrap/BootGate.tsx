import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';

import { BootErrorScreen } from './BootErrorScreen';
import { useAppBootstrap } from './useAppBootstrap';

// Keep the native splash up until boot finishes. Called at module load, before the first render.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

/** Renders nothing until boot finishes, then either the app or a readable error. */
export function BootGate({ children }: { children: ReactNode }) {
  const state = useAppBootstrap();

  useEffect(() => {
    if (state.status !== 'loading') SplashScreen.hide();
  }, [state.status]);

  if (state.status === 'loading') return null;
  if (state.status === 'error') return <BootErrorScreen title={state.title} detail={state.detail} />;
  return <>{children}</>;
}
