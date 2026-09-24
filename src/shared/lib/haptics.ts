import * as Haptics from 'expo-haptics';

/** Haptics are feedback, never required: failures (unsupported device, low power) are ignored. */
const fire = (effect: () => Promise<void>) => {
  effect().catch(() => undefined);
};

export const haptics = {
  light: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A gentle, cushioned bump: used when the page changes. */
  soft: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  selection: () => fire(() => Haptics.selectionAsync()),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
