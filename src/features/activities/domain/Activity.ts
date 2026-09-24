/** Matches the theme's activity colour keys; the theme resolves each to a hex per scheme. */
export type ActivityColor = 'green' | 'orange' | 'purple' | 'blue' | 'pink' | 'teal';

export interface Activity {
  id: string;
  name: string;
  /** Lucide icon name, e.g. "dumbbell". */
  icon: string;
  color: ActivityColor;
}
