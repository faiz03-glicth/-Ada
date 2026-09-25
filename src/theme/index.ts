// Public API of the theme module. The persisted store is intentionally not re-exported:
// ViewModels import it from theme/state directly, and Views never touch it.
export type {
  ActivityColorKey,
  ColorScheme,
  HeatLevel,
  HeatPaletteId,
  ReduceMotionPreference,
  Theme,
  ThemePreference,
  TypographyVariant,
  VisualStyle,
} from './types';
export { buildTheme } from './buildTheme';
export { HEAT_PALETTE_IDS } from './tokens/heatPalettes';
export { BRAND_GREEN } from './tokens/brand';
export { cssEase, motion } from './tokens/motion';
export { resolveScheme, useResolvedScheme } from './hooks/useResolvedScheme';
export { useNavigationMotion, type NavigationMotion } from './hooks/useNavigationMotion';
export { resolveReduceMotion, useReduceMotion, useSystemReduceMotion } from './hooks/useReduceMotion';
export { useStateTransition } from './hooks/useStateTransition';
// The motion system: presets by meaning, one source of timing, Reduce Motion resolved once.
export { heatRevealRules, type HeatRevealRules, type HeatRevealStyle } from './motion/cssMotion';
export { layoutMotion, type Direction } from './motion/layoutMotion';
export { useMotion } from './motion/useMotion';
export { isGlassSupported, resolveVisualStyle, useGlassSupport } from './hooks/useGlassSupport';
export { MotionRuntimeBridge } from './sync/MotionRuntimeBridge';
export { ThemeRuntimeBridge } from './sync/ThemeRuntimeBridge';
