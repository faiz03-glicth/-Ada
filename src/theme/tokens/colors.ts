import type { ColorScheme, SemanticColors } from '../types';
import { BRAND_GREEN, ON_BRAND } from './brand';

/**
 * Semantic colours, designed per scheme rather than inverted. Grounded in the colour-mode research the app
 * follows (Andrew 2026, Tuan et al. 2026, Atsani et al. 2025):
 * - Light is for clarity in bright surroundings. Large areas are soft off-whites, never a glaring pure
 *   white page; elevation is shown by small steps in lightness (canvas → surface → surfaceRaised, the
 *   nearest being the lightest), not by heavy shadows.
 * - Text meets WCAG AA on every surface it sits on (≥ 4.5:1) without pure black on pure white; control
 *   outlines (inputs, switches, selectable tiles) reach 3:1, because interactive areas are where apps most
 *   often fall short.
 * - The brand green is identical in both schemes (see brand.ts); only its surroundings adapt.
 */
export const semanticColors: Record<ColorScheme, SemanticColors> = {
  light: {
    canvas: '#F2F5F1',
    surface: '#FCFDFB',
    surfaceRaised: '#FFFFFF',
    subtle: '#EAEEE9',
    border: '#DCE2DB',
    border2: '#858F87',
    text: '#101713',
    text2: '#56625A',
    text3: '#646F67',
    accent: BRAND_GREEN,
    accentSoft: '#E2F4E8',
    accentText: '#136B38',
    onAccent: ON_BRAND,
    danger: '#C9302F',
    dangerSoft: '#FBE9E9',
    scrim: 'rgba(13,16,14,0.38)',
    thumb: '#FFFFFF',
  },
  dark: {
    canvas: '#0D100E',
    surface: '#161A18',
    surfaceRaised: '#1C221E',
    subtle: '#1E2320',
    border: '#262C28',
    border2: '#626D66',
    text: '#EDF2EE',
    text2: '#A4AEA7',
    text3: '#838E86',
    accent: BRAND_GREEN,
    accentSoft: '#15301F',
    accentText: '#5FE3A1',
    onAccent: ON_BRAND,
    danger: '#FF7070',
    dangerSoft: '#3A1D1D',
    scrim: 'rgba(0,0,0,0.6)',
    thumb: '#FFFFFF',
  },
};
