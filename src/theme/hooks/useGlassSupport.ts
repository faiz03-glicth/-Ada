import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

import type { VisualStyle } from '../types';

/** Capability only: Liquid Glass exists on iOS 26+ with the glass effect API available. Android always uses Classic. */
export function isGlassSupported(): boolean {
  return Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
}

/** PURE: the style that can actually be rendered. */
export function resolveVisualStyle(requested: VisualStyle, glassSupported: boolean): VisualStyle {
  return glassSupported ? requested : 'classic';
}

const SUPPORTED = isGlassSupported();

/** Device capability never changes at runtime, so this is a constant. */
export function useGlassSupport(): boolean {
  return SUPPORTED;
}
