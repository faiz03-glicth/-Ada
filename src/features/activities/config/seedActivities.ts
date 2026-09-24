import type { Activity } from '../domain/Activity';

/** Starter activities offered during onboarding. Ids are stable template keys. */
export const SEED_ACTIVITIES: readonly Activity[] = [
  { id: 'workout', name: 'Workout', icon: 'dumbbell', color: 'orange' },
  { id: 'deep-work', name: 'Deep work', icon: 'code', color: 'blue' },
  { id: 'reading', name: 'Reading', icon: 'book', color: 'purple' },
  { id: 'meditate', name: 'Meditate', icon: 'flower', color: 'pink' },
  { id: 'walk', name: 'Walk', icon: 'footprints', color: 'green' },
  { id: 'water', name: 'Water', icon: 'droplet', color: 'teal' },
];

export const DEFAULT_SELECTED_ACTIVITY_IDS: readonly string[] = ['workout', 'deep-work', 'reading'];
