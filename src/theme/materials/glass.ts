import type { ColorScheme, GlassMaterial } from '../types';

/** Liquid Glass material values (iOS 26+ only). */
export const glassMaterials: Record<ColorScheme, GlassMaterial> = {
  light: {
    card: { background: 'rgba(255,255,255,0.56)', edge: 'rgba(255,255,255,0.8)' },
    strong: 'rgba(255,255,255,0.78)',
    tint: 'rgba(16,40,26,0.06)',
    tabBar: '#F7FAF7',
    // Opaque: the liquid is drawn from overlapping shapes, so a translucent fill would show darker seams.
    // Equals rgba(30,154,82,0.13) over the tab bar.
    pill: '#DBEEE2',
    sheet: { tint: 'rgba(248,251,248,0.80)', blur: 30 },
    toast: { background: 'rgba(16,23,19,0.74)', foreground: '#F6F7F5', blur: 30 },
    canvasBase: '#F1F5F1',
    heatEmpty: 'rgba(16,40,26,0.075)',
  },
  dark: {
    card: { background: 'rgba(34,42,37,0.5)', edge: 'rgba(255,255,255,0.12)' },
    strong: 'rgba(48,58,52,0.70)',
    tint: 'rgba(255,255,255,0.07)',
    tabBar: '#141A16',
    // Equals rgba(61,214,140,0.18) over the tab bar (opaque, see light).
    pill: '#1B3C2B',
    sheet: { tint: 'rgba(24,30,26,0.82)', blur: 30 },
    toast: { background: 'rgba(237,242,238,0.82)', foreground: '#0D100E', blur: 30 },
    canvasBase: '#060907',
    heatEmpty: 'rgba(255,255,255,0.08)',
  },
};
