import * as Haptics from 'expo-haptics';

/** Haptics are feedback, never required: failures (unsupported device, low power) are ignored. */
const fire = (effect: () => Promise<void>) => {
  effect().catch(() => undefined);
};

const impact = (style: Haptics.ImpactFeedbackStyle) => fire(() => Haptics.impactAsync(style));

/** How hard a charging tick lands as the charge builds (0…1): light, then medium, then heavy. */
function chargeStyle(progress: number): Haptics.ImpactFeedbackStyle {
  if (progress < 0.4) return Haptics.ImpactFeedbackStyle.Light;
  if (progress < 0.75) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Heavy;
}

export interface HapticRamp {
  /** How long the charge takes to fill (ms). */
  durationMs: number;
  /** The gap between ticks at the start and at the end (ms): smaller = faster. */
  gapMs: { from: number; to: number };
}

export const haptics = {
  light: () => impact(Haptics.ImpactFeedbackStyle.Light),
  /** A gentle, cushioned bump: used when the page changes. */
  soft: () => impact(Haptics.ImpactFeedbackStyle.Soft),
  selection: () => fire(() => Haptics.selectionAsync()),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** One tick of a charge, as strong as the charge is full (0…1). */
  charge: (progress: number) => impact(chargeStyle(progress)),
  /**
   * A charge you can feel (press and hold): ticks that come faster and land harder as it fills, like
   * something winding up. Starts with a tick at once (so a tap is felt too). Returns `stop`, for letting
   * go early or leaving the screen; it stops by itself once the charge is full.
   */
  ramp: ({ durationMs, gapMs }: HapticRamp): (() => void) => {
    let elapsed = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const progress = Math.min(1, elapsed / durationMs);
      haptics.charge(progress);
      const gap = gapMs.from + (gapMs.to - gapMs.from) * progress;
      elapsed += gap;
      if (elapsed < durationMs) timer = setTimeout(tick, gap);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  },
};
