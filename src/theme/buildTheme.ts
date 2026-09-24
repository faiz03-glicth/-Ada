import { glassMaterials } from './materials/glass';
import { activityColors } from './tokens/activityColors';
import { brandColors } from './tokens/brandColors';
import { semanticColors } from './tokens/colors';
import { elevation } from './tokens/elevation';
import { heatPalettes } from './tokens/heatPalettes';
import { radii } from './tokens/radii';
import { spacing } from './tokens/spacing';
import { fonts, typography } from './tokens/typography';
import type { ColorScheme, HeatPaletteId, HeatSteps, Theme, VisualStyle } from './types';

/** PURE: composes tokens into a complete theme. No side effects. */
export function buildTheme(scheme: ColorScheme, paletteId: HeatPaletteId, style: VisualStyle): Theme {
  const glass = style === 'glass' ? glassMaterials[scheme] : null;
  const baseColors = semanticColors[scheme];
  const baseHeat = heatPalettes[paletteId][scheme];
  const heat: HeatSteps = glass
    ? [glass.heatEmpty, baseHeat[1], baseHeat[2], baseHeat[3], baseHeat[4]]
    : baseHeat;

  return {
    scheme,
    style,
    paletteId,
    colors: glass ? { ...baseColors, canvas: glass.canvasBase, subtle: glass.tint } : baseColors,
    activity: activityColors[scheme],
    heat,
    brand: brandColors[scheme],
    elevation: elevation[scheme],
    glass,
    typography,
    fonts,
    spacing,
    radii,
  };
}
