import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Appearance, AppState, StyleSheet } from 'react-native';
import { SystemBars, type SystemBarsEntry } from 'react-native-edge-to-edge';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { UnistylesRuntime } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';
import { useShallow } from 'zustand/react/shallow';

import { buildTheme } from '../buildTheme';
import { resolveVisualStyle, useGlassSupport } from '../hooks/useGlassSupport';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useResolvedScheme } from '../hooks/useResolvedScheme';
import { useThemePreferencesStore } from '../state/themePreferencesStore';
import { motion } from '../tokens/motion';
import type { ColorScheme, HeatPaletteId, VisualStyle } from '../types';

/** Everything that decides how the app looks. */
interface Look {
  scheme: ColorScheme;
  paletteId: HeatPaletteId;
  style: VisualStyle;
}

const sameLook = (a: Look, b: Look) =>
  a.scheme === b.scheme && a.paletteId === b.paletteId && a.style === b.style;
const canvasOf = (look: Look) => buildTheme(look.scheme, look.paletteId, look.style).colors.canvas;

const { themeFade, ease } = motion;
// Opacity only, driven by the bridge itself (with Reduce Motion the veil is skipped, not shortened).
const veilIn = { duration: themeFade.in, easing: ease.exit, reduceMotion: ReduceMotion.Never };
const veilOut = { duration: themeFade.out, easing: ease.enter, reduceMotion: ReduceMotion.Never };

/**
 * Keeps the native theme, appearance and system bars in sync with the stored preferences, and makes theme
 * changes fluid. The preference (e.g. "System") is stored as chosen; the resolved look is derived from it.
 *
 * A change fades through the new background: a veil in the new canvas colour covers the app, the theme is
 * swapped underneath while nothing is visible, then the veil lifts. There is never a half-themed frame or
 * a flash, and the brand green (identical in both schemes) simply stays put. The veil is one opacity
 * animation on the UI thread, so nothing re-renders per frame. It never plays at launch (the first frame
 * is already right), with Reduce Motion (the swap is instant), or while the app is in the background.
 * Rapid changes retarget the veil; the latest choice is the one revealed.
 *
 * Rendered after the app so the veil sits above everything.
 */
export function ThemeRuntimeBridge() {
  const { preference, paletteId, style } = useThemePreferencesStore(
    useShallow((s) => ({ preference: s.preference, paletteId: s.paletteId, style: s.style })),
  );
  const scheme = useResolvedScheme(preference);
  const renderedStyle = resolveVisualStyle(style, useGlassSupport());
  const reduced = useReduceMotion();

  const target = useMemo<Look>(
    () => ({ scheme, paletteId, style: renderedStyle }),
    [scheme, paletteId, renderedStyle],
  );
  // What is on screen (null until first applied) and what was asked for last: plain refs, since applying
  // a look is imperative and must never wait for a React render.
  const shown = useRef<Look | null>(null);
  const latest = useRef(target);
  const bars = useRef<SystemBarsEntry | null>(null);
  const veil = useSharedValue(0);
  const veilColor = useSharedValue(canvasOf(target));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.get(), backgroundColor: veilColor.get() }));

  // Native controls (sheets, keyboards, alerts, Apple button) follow the app's choice, not just the OS.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const apply = useCallback((look: Look) => {
    shown.current = look;
    UnistylesRuntime.updateTheme('light', () => buildTheme('light', look.paletteId, look.style));
    UnistylesRuntime.updateTheme('dark', () => buildTheme('dark', look.paletteId, look.style));
    UnistylesRuntime.setTheme(look.scheme);
    UnistylesRuntime.setRootViewBackgroundColor(canvasOf(look));
    // Status and navigation bar icons: dark on the light canvas, light on the dark one.
    const bar = { style: look.scheme === 'dark' ? ('light' as const) : ('dark' as const) };
    bars.current = bars.current
      ? SystemBars.replaceStackEntry(bars.current, bar)
      : SystemBars.pushStackEntry(bar);
  }, []);

  // Called on the JS thread once the veil fully covers the app: swap, then lift after two frames.
  const reveal = useCallback(() => {
    apply(latest.current);
    veil.set(withDelay(themeFade.hold, withTiming(0, veilOut)));
  }, [apply, veil]);

  useEffect(() => {
    latest.current = target;
    const current = shown.current;
    if (current && sameLook(target, current)) return;
    // Launch (already right on the first frame), Reduce Motion, or not on screen: apply at once.
    if (!current || reduced || AppState.currentState !== 'active') {
      veil.set(0);
      apply(target);
      return;
    }
    veilColor.set(canvasOf(target));
    veil.set(
      withTiming(1, veilIn, (finished) => {
        if (finished) scheduleOnRN(reveal);
      }),
    );
  }, [target, reduced, apply, reveal, veil, veilColor]);

  useEffect(
    () => () => {
      if (bars.current) SystemBars.popStackEntry(bars.current);
    },
    [],
  );

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, veilStyle]}
    />
  );
}
