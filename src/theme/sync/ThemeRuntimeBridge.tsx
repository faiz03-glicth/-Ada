import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { UnistylesRuntime } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import { buildTheme } from '../buildTheme';
import { resolveVisualStyle, useGlassSupport } from '../hooks/useGlassSupport';
import { useResolvedScheme } from '../hooks/useResolvedScheme';
import { useThemePreferencesStore } from '../state/themePreferencesStore';

/**
 * Side effect only: pushes the current preferences into Unistyles, the native appearance and the system
 * bars. With 'system' the scheme follows the phone live; a Light/Dark choice overrides it everywhere.
 */
export function ThemeRuntimeBridge() {
  const { preference, paletteId, style } = useThemePreferencesStore(
    useShallow((s) => ({ preference: s.preference, paletteId: s.paletteId, style: s.style })),
  );
  const scheme = useResolvedScheme(preference);
  const renderedStyle = resolveVisualStyle(style, useGlassSupport());

  // Native controls (sheets, keyboards, alerts, Apple button) follow the app's choice, not just the OS.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  useEffect(() => {
    UnistylesRuntime.updateTheme('light', () => buildTheme('light', paletteId, renderedStyle));
    UnistylesRuntime.updateTheme('dark', () => buildTheme('dark', paletteId, renderedStyle));
  }, [paletteId, renderedStyle]);

  useEffect(() => {
    UnistylesRuntime.setTheme(scheme);
    UnistylesRuntime.setRootViewBackgroundColor(buildTheme(scheme, paletteId, renderedStyle).colors.canvas);
  }, [scheme, paletteId, renderedStyle]);

  // Status and navigation bar icons: dark on the light canvas, light on the dark one.
  return <SystemBars style={scheme === 'dark' ? 'light' : 'dark'} />;
}
