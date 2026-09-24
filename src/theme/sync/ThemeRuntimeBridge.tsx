import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import { buildTheme } from '../buildTheme';
import { resolveVisualStyle, useGlassSupport } from '../hooks/useGlassSupport';
import { useResolvedScheme } from '../hooks/useResolvedScheme';
import { useThemePreferencesStore } from '../state/themePreferencesStore';

/** Side effect only: pushes the current preferences into Unistyles and the native appearance. Renders nothing. */
export function ThemeRuntimeBridge(): null {
  const { preference, paletteId, style } = useThemePreferencesStore(
    useShallow((s) => ({ preference: s.preference, paletteId: s.paletteId, style: s.style })),
  );
  const scheme = useResolvedScheme(preference);
  const renderedStyle = resolveVisualStyle(style, useGlassSupport());

  // Native controls (sheets, keyboards, Apple button, status bar) follow the app's choice, not just the OS.
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

  return null;
}
