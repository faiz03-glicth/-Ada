import { SEED_ACTIVITIES } from '../config/seedActivities';
import type { Activity } from './Activity';

/**
 * The activities a person can check in: the one list every screen reads (check-in, Home, History,
 * Insights, Activity preferences, onboarding). Today it's the six starter activities; custom activities
 * would join this list, never a screen's own copy of it.
 */
export const ACTIVITIES: readonly Activity[] = SEED_ACTIVITIES;

const BY_ID = new Map(ACTIVITIES.map((activity) => [activity.id, activity]));

/** Shown for a check-in whose activity no longer exists, so its row still reads sensibly. */
const UNKNOWN: Activity = { id: 'unknown', name: 'Activity', icon: 'sparkles', color: 'green' };

export function isActivityId(id: string): boolean {
  return BY_ID.has(id);
}

export function activityById(id: string): Activity {
  return BY_ID.get(id) ?? UNKNOWN;
}
