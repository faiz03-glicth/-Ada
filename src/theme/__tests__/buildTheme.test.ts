import { buildTheme } from '../buildTheme';
import { HEAT_PALETTE_IDS } from '../tokens/heatPalettes';
import type { ColorScheme, Theme, VisualStyle } from '../types';

const SCHEMES: ColorScheme[] = ['light', 'dark'];
const STYLES: VisualStyle[] = ['classic', 'glass'];
const COMBOS = SCHEMES.flatMap((scheme) =>
  HEAT_PALETTE_IDS.flatMap((palette) => STYLES.map((style) => [scheme, palette, style] as const)),
);

const COLOR = /^(#[0-9A-F]{6}|rgba\(\d+,\d+,\d+,(0|1|0?\.\d+)\))$/i;

function collectStrings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => collectStrings(child, `${path}.${key}`));
  }
  return [];
}

describe('buildTheme', () => {
  it('covers all 16 scheme × palette × style combinations', () => {
    expect(COMBOS).toHaveLength(16);
  });

  it.each(COMBOS)('%s / %s / %s produces a complete theme', (scheme, palette, style) => {
    const theme: Theme = buildTheme(scheme, palette, style);

    expect(theme.scheme).toBe(scheme);
    expect(theme.paletteId).toBe(palette);
    expect(theme.style).toBe(style);
    expect(theme.heat).toHaveLength(5);
    expect(Object.keys(theme.activity).sort()).toEqual(['blue', 'green', 'orange', 'pink', 'purple', 'teal']);

    const colors = collectStrings({
      colors: theme.colors,
      activity: theme.activity,
      heat: theme.heat,
      brand: theme.brand,
    });
    for (const [path, color] of colors) {
      expect({ path, valid: COLOR.test(color) }).toEqual({ path, valid: true });
    }

    if (style === 'glass') {
      expect(theme.glass).not.toBeNull();
      expect(theme.heat[0]).toBe(theme.glass?.heatEmpty);
      expect(theme.colors.subtle).toBe(theme.glass?.tint);
    } else {
      expect(theme.glass).toBeNull();
    }
  });

  it('matches the approved design tokens', () => {
    const light = buildTheme('light', 'meadow', 'classic');
    const dark = buildTheme('dark', 'meadow', 'classic');

    expect(light.colors.canvas).toBe('#F6F7F5');
    expect(dark.colors.canvas).toBe('#0D100E');
    // Darkened from the prototype's #1E9A52 so white button labels meet WCAG AA (see contrast.test).
    expect(light.colors.accent).toBe('#16843F');
    expect(dark.colors.onAccent).toBe('#06140C');
    expect(light.heat).toEqual(['#EAEEE9', '#C3E8C9', '#7FD095', '#36AA62', '#146B3A']);
    expect(dark.heat).toEqual(['#1F2622', '#1A4A2F', '#1F7A45', '#34B267', '#6BE8A4']);
    expect(buildTheme('light', 'meadow', 'glass').heat[0]).toBe('rgba(16,40,26,0.075)');
    expect(buildTheme('dark', 'meadow', 'glass').heat[0]).toBe('rgba(255,255,255,0.08)');
  });

  it('is pure: identical inputs give equal themes', () => {
    expect(buildTheme('dark', 'ocean', 'glass')).toEqual(buildTheme('dark', 'ocean', 'glass'));
  });
});
