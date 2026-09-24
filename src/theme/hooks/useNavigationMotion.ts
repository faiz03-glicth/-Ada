import { useReducedMotion } from 'react-native-reanimated';

import { motion } from '../tokens/motion';

export interface NavigationMotion {
  push: typeof motion.navigation.push | 'none';
  groupSwitch: typeof motion.navigation.groupSwitch | 'none';
  tabs: typeof motion.navigation.tabs | 'none';
}

const STILL: NavigationMotion = { push: 'none', groupSwitch: 'none', tabs: 'none' };

/** Screen transition names for the navigators; every transition is off when Reduce Motion is on. */
export function useNavigationMotion(): NavigationMotion {
  return useReducedMotion() ? STILL : motion.navigation;
}
