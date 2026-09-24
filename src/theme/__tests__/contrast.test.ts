import { BRAND_GREEN } from '../tokens/brand';
import { semanticColors } from '../tokens/colors';

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe.each(['light', 'dark'] as const)('%s colours', (scheme) => {
  const c = semanticColors[scheme];

  it('keep the brand green as the accent, unchanged by the theme', () => {
    expect(BRAND_GREEN).toBe('#1E9A52');
    expect(c.accent).toBe(BRAND_GREEN);
  });

  it.each([
    ['text', c.text, c.canvas],
    ['secondary text', c.text2, c.canvas],
    ['secondary text on cards', c.text2, c.surface],
    ['tertiary text and inactive tab labels', c.text3, c.canvas],
    ['tertiary text on cards', c.text3, c.surface],
    ['tertiary text on the tab bar', c.text3, c.surfaceRaised],
    ['text and icons on the brand green', c.onAccent, c.accent],
    ['green text on the page', c.accentText, c.canvas],
    ['green text on the active surface (selected tab)', c.accentText, c.accentSoft],
    ['errors on cards', c.danger, c.surface],
    ['errors on the error banner', c.danger, c.dangerSoft],
  ])('%s meets AA (≥ 4.5:1)', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['on the page', c.canvas],
    ['on cards', c.surface],
    ['on the active surface', c.accentSoft],
  ])('the brand green as an icon or fill is ≥ 3:1 %s', (_name, background) => {
    expect(contrast(c.accent, background)).toBeGreaterThanOrEqual(3);
  });

  it('control outlines (inputs, switches, selectable tiles) are ≥ 3:1 on cards and the page', () => {
    expect(contrast(c.border2, c.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(c.border2, c.canvas)).toBeGreaterThanOrEqual(3);
  });

  it('shows elevation through lightness, the nearest surface being the lightest (light) or brightest (dark)', () => {
    expect(luminance(c.surfaceRaised)).toBeGreaterThanOrEqual(luminance(c.surface));
    expect(luminance(c.surface)).toBeGreaterThan(luminance(c.canvas));
  });
});
