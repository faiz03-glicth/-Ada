import {
  useNotificationPreferencesStore,
  type NotificationPreferenceKey,
} from '@/features/notifications/state/notificationPreferencesStore';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';

export type NotificationSetting = NotificationPreferenceKey;

/** Notifications: the saved reminder choices (nothing is scheduled yet; the screen says so). */
export function useNotificationsSettingsViewModel() {
  const dailyReminder = useNotificationPreferencesStore((s) => s.dailyReminder);
  const streakProtection = useNotificationPreferencesStore((s) => s.streakProtection);
  const weeklySummary = useNotificationPreferencesStore((s) => s.weeklySummary);
  const milestones = useNotificationPreferencesStore((s) => s.milestones);
  const quietHours = useNotificationPreferencesStore((s) => s.quietHours);
  const set = useNotificationPreferencesStore((s) => s.set);

  return {
    values: { dailyReminder, streakProtection, weeklySummary, milestones, quietHours },
    onToggle: (key: NotificationPreferenceKey) => (on: boolean) => {
      haptics.selection();
      set(key, on);
    },
    onBack: () => goBack(),
  };
}
