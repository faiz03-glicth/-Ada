import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import type { TabId } from '../config/tabs';
import {
  buildSlots,
  labelLimits,
  type BarGeometry,
  type BubbleMetrics,
  type ContentSize,
  type TabFrame,
} from './tabSlots';

/**
 * The liquid wraps each tab's icon + label with 12pt either side and 7pt above and below (room for the
 * icon's magnification too), prefers at least 56pt, and keeps 3pt clear of the bar's ends, the + button
 * and the other tabs' content.
 */
export const BUBBLE: BubbleMetrics = { padX: 12, minWidth: 56, gap: 3 };
export const BUBBLE_PAD_Y = 7;
export const TAB_ICON = 24;

const sameSize = (a: ContentSize | undefined | null, b: ContentSize) =>
  !!a && a.width === b.width && a.height === b.height;
const sameFrame = (a: TabFrame | undefined | null, b: TabFrame) =>
  sameSize(a, b) && !!a && a.x === b.x && a.y === b.y;
const frameOf = ({ nativeEvent: { layout } }: LayoutChangeEvent): TabFrame => ({
  x: layout.x,
  y: layout.y,
  width: layout.width,
  height: layout.height,
});

/**
 * Measures the tab bar (the bar, each tab, each tab's content, the + button) and turns that into where the
 * liquid rests on each tab, how wide it is there, and how wide each label may be. Everything is measured,
 * never assumed, so it adapts to any screen width, orientation or system font size.
 */
export function useTabBarLayout(ids: readonly TabId[], active: TabId, fabSize: number) {
  const [frames, setFrames] = useState<Partial<Record<TabId, TabFrame>>>({});
  const [contents, setContents] = useState<Partial<Record<TabId, ContentSize>>>({});
  const [bar, setBar] = useState<TabFrame | null>(null);
  const [fab, setFab] = useState<TabFrame | null>(null);
  // Also read on the UI thread by the footer's stretch.
  const barWidth = useSharedValue(0);

  const measureTab = useCallback((id: TabId, event: LayoutChangeEvent) => {
    const frame = frameOf(event);
    setFrames((current) => (sameFrame(current[id], frame) ? current : { ...current, [id]: frame }));
  }, []);
  const measureContent = useCallback((id: TabId, event: LayoutChangeEvent) => {
    const { width, height } = frameOf(event);
    setContents((current) =>
      sameSize(current[id], { width, height }) ? current : { ...current, [id]: { width, height } },
    );
  }, []);
  const measureBar = useCallback(
    (event: LayoutChangeEvent) => {
      const frame = frameOf(event);
      barWidth.set(frame.width);
      setBar((current) => (sameFrame(current, frame) ? current : frame));
    },
    [barWidth],
  );
  const measureFab = useCallback((event: LayoutChangeEvent) => {
    const frame = frameOf(event);
    setFab((current) => (sameFrame(current, frame) ? current : frame));
  }, []);

  const geometry = useMemo<BarGeometry>(
    () => ({
      // Until the bar itself is measured, only the + button and the neighbours limit the liquid.
      bounds: { left: 0, right: bar?.width ?? Infinity },
      obstacles: fab
        ? [{ left: fab.x + (fab.width - fabSize) / 2, right: fab.x + (fab.width + fabSize) / 2 }]
        : [],
    }),
    [bar, fab, fabSize],
  );
  const slots = useMemo(
    () => buildSlots(ids, frames, contents, geometry, BUBBLE),
    [ids, frames, contents, geometry],
  );
  const labels = useMemo(() => labelLimits(ids, frames, geometry, BUBBLE, TAB_ICON), [ids, frames, geometry]);

  // One bubble height for every tab: the tallest content plus padding, centred on the tab row.
  const row = frames[active];
  const tallest = Math.max(0, ...Object.values(contents).map((size) => size?.height ?? 0));
  const height = tallest > 0 ? tallest + BUBBLE_PAD_Y * 2 : (row?.height ?? 0);
  const bubble = row ? { top: row.y + (row.height - height) / 2, height } : null;

  return { frames, slots, labels, bubble, barWidth, measureTab, measureContent, measureBar, measureFab };
}
