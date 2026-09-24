// Public API of the theme module. The persisted store is intentionally not re-exported:
// ViewModels import it from theme/state directly, and Views never touch it.
export type {
  ActivityColorKey,
  ColorScheme,
  HeatLevel,
  HeatPaletteId,
  Theme,
  ThemePreference,
  TypographyVariant,
  VisualStyle,
} from './types';
export { buildTheme } from './buildTheme';
export { HEAT_PALETTE_IDS } from './tokens/heatPalettes';
export { motion } from './tokens/motion';
export { resolveScheme, useResolvedScheme } from './hooks/useResolvedScheme';
export { useNavigationMotion, type NavigationMotion } from './hooks/useNavigationMotion';
export { isGlassSupported, resolveVisualStyle, useGlassSupport } from './hooks/useGlassSupport';
export { ThemeRuntimeBridge } from './sync/ThemeRuntimeBridge';
