/** How dark a day is on the heatmap. These thresholds are domain rules; colours live in the theme. */
export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface IntensityLevelInfo {
  level: IntensityLevel;
  name: string;
  rangeLabel: string;
}

/** PURE: 0 → 0, 1 → 1, 2–3 → 2, 4–5 → 3, 6+ → 4. Anything that isn't a positive count is level 0. */
export function intensityLevel(checkIns: number): IntensityLevel {
  if (!(checkIns >= 1)) return 0;
  if (checkIns < 2) return 1;
  if (checkIns < 4) return 2;
  if (checkIns < 6) return 3;
  return 4;
}

export const INTENSITY_LEVELS: readonly IntensityLevelInfo[] = [
  { level: 0, name: 'No activity', rangeLabel: '0 check-ins' },
  { level: 1, name: 'Light', rangeLabel: '1 check-in' },
  { level: 2, name: 'Moderate', rangeLabel: '2–3 check-ins' },
  { level: 3, name: 'Strong', rangeLabel: '4–5 check-ins' },
  { level: 4, name: 'Peak', rangeLabel: '6+ check-ins' },
];
