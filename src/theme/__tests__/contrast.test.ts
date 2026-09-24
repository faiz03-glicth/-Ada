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

describe.each(['light', 'dark'] as const)('%s colours meet WCAG AA', (scheme) => {
  const c = semanticColors[scheme];

  it.each([
    ['text', c.text, c.canvas],
    ['secondary text', c.text2, c.canvas],
    ['secondary text on cards', c.text2, c.surface],
    ['tertiary text and inactive tab labels', c.text3, c.canvas],
    ['tertiary text on cards and the tab bar', c.text3, c.surface],
    ['button labels on the accent', c.onAccent, c.accent],
    ['active labels on the active surface', c.accentText, c.accentSoft],
    ['errors on cards', c.danger, c.surface],
  ])('%s ≥ 4.5:1', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('control outlines (switch track, selectable tiles) ≥ 3:1 against cards', () => {
    expect(contrast(c.border2, c.surface)).toBeGreaterThanOrEqual(3);
  });
});
