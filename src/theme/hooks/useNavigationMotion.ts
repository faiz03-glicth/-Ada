import { motion } from '../tokens/motion';
import { useReduceMotion } from './useReduceMotion';

export type NavigationMotion = typeof motion.navigation | typeof motion.reducedNavigation;

/** Screen transition names for the navigators; calmer (fades, no sliding) when Reduce Motion is on. */
export function useNavigationMotion(): NavigationMotion {
  return useReduceMotion() ? motion.reducedNavigation : motion.navigation;
}
