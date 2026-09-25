import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { haptics } from '@/shared/lib/haptics';
import { sounds } from '@/shared/lib/sounds';
import { motion } from '@/theme';

const slide = motion.timing(motion.pager.slideMs);
const { landWithin } = motion.pager;

/**
 * The page the pager has just landed on, or null. Landed means: no finger on it, and within `landWithin`
 * of a page's spot (the snap's last points crawl, so waiting for it to stop would sound late). A page that
 * was already the landed one doesn't land again (a swipe that snaps back is silent).
 */
export function landedPage(position: number, landed: number, count: number): number | null {
  'worklet';
  const nearest = Math.min(count - 1, Math.max(0, Math.round(position)));
  if (nearest === landed || Math.abs(position - nearest) > landWithin) return null;
  return nearest;
}

export interface PagerProps {
  /** How many pages. */
  count: number;
  /** The page to show. Changing it (a button, Back) slides there. */
  index: number;
  /** A swipe made another page the main one (it's reported as soon as it covers most of the screen). */
  onIndexChange: (index: number) => void;
  /** Written by the pager, in pages (1.5 = halfway from the second to the third), for things that follow it. */
  progress: SharedValue<number>;
  /** The screen's side padding: the pager is full-bleed, and each page puts the padding back inside. */
  inset: number;
  /** `seen`: the page has been the current one at least once (entrances wait for it). */
  renderPage: (page: number, seen: boolean) => ReactNode;
}

/**
 * Pages side by side that the person swipes through (onboarding). A swipe moves them with the finger and
 * the platform snaps to the nearest page; setting `index` slides a whole page on the motion system's curve.
 * A finger always wins: touching the pager mid-slide stops the slide where it is. Each page that settles
 * into place is set down like a block: a wooden clack and a soft tick. Only the current page is exposed to
 * screen readers. Nothing re-renders per frame: `progress` is a UI-thread value.
 */
export function Pager({ count, index, onIndexChange, progress, inset, renderPage }: PagerProps) {
  const { width } = useWindowDimensions();
  const ref = useAnimatedRef<Animated.ScrollView>();
  // Where a driven slide is taking the pager (x offset); only ever animated, never touched by a swipe.
  const target = useSharedValue(index * width);
  // The last page the pager reported, on both threads (a swipe reports; the JS copy tells the two apart).
  const reported = useRef(index);
  const reportedOnUI = useSharedValue(index);
  // The page it last settled on, and whether a finger is on it (a held page hasn't landed yet).
  const landedOnUI = useSharedValue(index);
  const dragging = useSharedValue(false);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([index]));
  if (!seen.has(index)) setSeen(new Set(seen).add(index));

  // A page settling into place: one block set down.
  const setDown = useCallback(() => {
    sounds.play('pageClack');
    haptics.soft();
  }, []);

  const report = useCallback(
    (page: number) => {
      reported.current = page;
      onIndexChange(page);
    },
    [onIndexChange],
  );

  useEffect(() => sounds.preload('pageClack'), []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const position = event.contentOffset.x / width;
      progress.set(position);
      const nearest = Math.min(count - 1, Math.max(0, Math.round(position)));
      if (nearest !== reportedOnUI.get()) {
        reportedOnUI.set(nearest);
        scheduleOnRN(report, nearest);
      }
      if (dragging.get()) return;
      const page = landedPage(position, landedOnUI.get(), count);
      if (page !== null) {
        landedOnUI.set(page);
        scheduleOnRN(setDown);
      }
    },
    onBeginDrag: () => {
      dragging.set(true);
      cancelAnimation(target);
    },
    // Let go exactly on a page (no snap to follow): it has landed now.
    onEndDrag: (event) => {
      dragging.set(false);
      const page = landedPage(event.contentOffset.x / width, landedOnUI.get(), count);
      if (page !== null) {
        landedOnUI.set(page);
        scheduleOnRN(setDown);
      }
    },
  });

  // A driven slide moves the pager frame by frame on the UI thread (a swipe never changes `target`).
  useAnimatedReaction(
    () => target.get(),
    (x, previous) => {
      if (previous !== null) scrollTo(ref, x, 0, false);
    },
  );

  useEffect(() => {
    // The pager itself got there (a swipe): nothing to drive.
    if (index === reported.current) return;
    const to = index * width;
    scheduleOnUI(() => {
      // Start from wherever the pages are now, so a new slide never jumps.
      target.set(progress.get() * width);
      target.set(withTiming(to, slide));
    });
  }, [index, width, progress, target]);

  return (
    <Animated.ScrollView
      ref={ref}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      decelerationRate="fast"
      contentOffset={{ x: index * width, y: 0 }}
      onScroll={onScroll}
      style={styles.pager(inset)}
    >
      {Array.from({ length: count }, (_, page) => (
        <View
          key={page}
          style={styles.page(width, inset)}
          importantForAccessibility={page === index ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={page !== index}
        >
          {renderPage(page, seen.has(page))}
        </View>
      ))}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  // Fills the space its screen gives it, so the tallest page never pushes what's below it off screen.
  pager: (inset: number) => ({ marginHorizontal: -inset, flexGrow: 1 }),
  page: (width: number, inset: number) => ({ width, paddingHorizontal: inset, gap: theme.spacing.xl }),
}));
