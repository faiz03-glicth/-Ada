import { useFonts } from 'expo-font';

import { envResult } from '../config/env';
import { combineBootState, done, failed, pending, type BootState, type BootTask } from './bootState';
import { APP_FONTS } from './fonts';

function envTask(): BootTask {
  return envResult.ok
    ? done
    : failed(
        'Streak is missing its configuration',
        `Check these values in .env: ${envResult.invalidKeys.join(', ')}`,
      );
}

function useFontsTask(): BootTask {
  const [loaded, error] = useFonts(APP_FONTS);
  if (error) return failed('Fonts failed to load', error.message);
  return loaded ? done : pending;
}

/** Composes everything that must finish before the first screen: config, fonts (migrations and session restore join later). */
export function useAppBootstrap(): BootState {
  const tasks = [envTask(), useFontsTask()];
  return combineBootState(tasks);
}
