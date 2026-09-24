import type { ColorScheme, SemanticColors } from '../types';

/**
 * Semantic colours. Light is designed for clarity in bright surroundings, not inverted from dark:
 * - hierarchy: canvas → surface (cards) → surfaceRaised (floating chrome) → subtle (fills) → accentSoft (active);
 * - text and the icons/labels that carry meaning meet WCAG AA on their surfaces (text ≥ 4.5:1, control
 *   outlines ≥ 3:1), without pure black on pure white (a calmer, lower-glare pairing);
 * - accent (brand green) means "primary action / selected", danger means "error"; neither is decoration.
 */
export const semanticColors: Record<ColorScheme, SemanticColors> = {
  light: {
    canvas: '#F6F7F5',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    subtle: '#EFF2EE',
    border: '#E4E8E3',
    border2: '#8A968D',
    text: '#101713',
    text2: '#56625A',
    text3: '#68736B',
    accent: '#16843F',
    accentPress: '#126E35',
    accentSoft: '#E2F4E8',
    accentText: '#136B38',
    onAccent: '#FFFFFF',
    danger: '#D23B3B',
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
    text3: '#7C877F',
    accent: '#3DD68C',
    accentPress: '#2FB574',
    accentSoft: '#15301F',
    accentText: '#5FE3A1',
    onAccent: '#06140C',
    danger: '#FF7070',
    dangerSoft: '#3A1D1D',
    scrim: 'rgba(0,0,0,0.6)',
    thumb: '#FFFFFF',
  },
};
