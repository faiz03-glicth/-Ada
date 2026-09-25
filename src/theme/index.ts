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
export { resolveScheme, useResolvedScheme } from './hooks/useResolvedScheme';
export { resolveReduceMotion, useReduceMotion, useSystemReduceMotion } from './hooks/useReduceMotion';
export { isGlassSupported, resolveVisualStyle, useGlassSupport } from './hooks/useGlassSupport';
// The motion system: one source of timing (tokens), presets by meaning, Reduce Motion resolved once.
// Components ask for a meaning (press, selection, heatmapReveal, push…); none writes its own animation.
export { cssEase, motion, type Curve } from './tokens/motion';
export { heatmapRevealDelay, type HeatmapRevealStyle } from './motion/cssMotion';
export { layoutMotion, type Direction } from './motion/layoutMotion';
export { useHoldMotion, type HoldMotionEvents } from './motion/useHoldMotion';
export { useMotion } from './motion/useMotion';
export { useNavigationMotion, type NavigationMotion } from './motion/useNavigationMotion';
export { usePressMotion, type PressFeedback } from './motion/usePressMotion';
export { useSelectionMotion } from './motion/useSelectionMotion';
export { useStateTransition } from './motion/useStateTransition';
export { MotionRuntimeBridge } from './sync/MotionRuntimeBridge';
export { ThemeRuntimeBridge } from './sync/ThemeRuntimeBridge';
