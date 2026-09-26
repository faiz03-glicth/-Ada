import { useMemo } from 'react';

import { ACTIVITIES } from '@/features/activities/domain/catalog';
import { useAuthStore } from '@/features/auth/state/authStore';
import { countOn } from '@/features/checkins/domain/checkInIndex';
import { bestStreak } from '@/features/checkins/domain/stats';
import { useCheckIns } from '@/features/checkins/hooks/useCheckIns';
import { buildWeeksGrid } from '@/features/heatmap/domain/calendarGrid';
import { useNotificationPreferencesStore } from '@/features/notifications/state/notificationPreferencesStore';
import { openHelpCenter, openSettings } from '@/shared/actions';
import { useSessionActions } from '@/shared/actions/session';
import { monthShort, weekdayLetters } from '@/shared/lib/date/calendar';
import type { ISODate } from '@/shared/lib/date/isoDate';
import { useToday } from '@/shared/lib/date/useToday';
import { useCalendarPreferencesStore } from '@/shared/state/calendarPreferencesStore';
import { useThemePreferencesStore } from '@/theme/state/themePreferencesStore';

import { profileTitle } from '../domain/Profile';
import { useProfile } from '../hooks/useProfile';

/** Weeks in Profile's heatmap. */
export const PROFILE_WEEKS = 20;

const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;

/**
 * Profile: who's signed in, their totals and last 20 weeks, and the way into every setting (grouped as
 * Account, Preferences, Data and Support), with Log out on its own at the bottom.
 */
export function useProfileViewModel() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user);
  const { signOut } = useSessionActions();
  const { index } = useCheckIns();
  const today = useToday();
  const weekStart = useCalendarPreferencesStore((s) => s.weekStart);
  const outlineToday = useCalendarPreferencesStore((s) => s.outlineToday);
  const theme = useThemePreferencesStore((s) => s.preference);
  const dailyReminder = useNotificationPreferencesStore((s) => s.dailyReminder);

  const isGuest = user?.provider === 'guest';
  const identity = profile ?? user;
  const name = identity ? profileTitle(identity) : 'Guest';
  const created = profile?.createdAt ? new Date(profile.createdAt) : null;

  const weeks = useMemo(
    () =>
      buildWeeksGrid(PROFILE_WEEKS, {
        countOn: (day: ISODate) => countOn(index, day),
        today,
        weekStart,
        outlineToday,
      }),
    [index, today, weekStart, outlineToday],
  );
  const best = useMemo(() => bestStreak(index), [index]);
  const weeksActive = weeks.grid.columns.flat().filter((cell) => (cell.count ?? 0) > 0).length;

  return {
    name,
    avatarName: isGuest ? null : name,
    avatarUrl: profile?.avatarUrl ?? user?.avatarUrl ?? null,
    detail: isGuest ? 'Your check-ins are stored on this device' : (profile?.email ?? user?.email ?? null),
    memberSince: created ? `Member since ${monthShort(created.getMonth())} ${created.getFullYear()}` : null,

    totals: { checkIns: index.total, bestStreak: best, activeDays: index.days.length },
    weeks,
    dayLabels: weekdayLetters(weekStart),
    weeksLabel: `Last ${PROFILE_WEEKS} weeks: ${weeksActive} active days`,

    themeValue: THEME_LABEL[theme],
    notificationsValue: dailyReminder ? 'On' : 'Off',
    activitiesValue: `${ACTIVITIES.length} activities`,

    onAccount: () => openSettings('account'),
    onAppearance: () => openSettings('appearance'),
    onNotifications: () => openSettings('notifications'),
    onActivities: () => openSettings('activities'),
    onPrivacy: () => openSettings('privacy'),
    onAbout: () => openSettings('about'),
    onHelp: () => void openHelpCenter(),
    onLogOut: () => void signOut(),
  };
}
