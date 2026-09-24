import { buildLevelGrid, type HeatGrid } from '@/features/heatmap/domain/grid';
import type { IntensityLevel } from '@/features/heatmap/domain/intensity';
import { seededRandom } from '@/shared/lib/random/seededRandom';

export const HERO_COLUMNS = 14;
export const HERO_ROWS = 7;

/** A stable, believable heatmap for the Welcome card: about a quarter of days empty, the rest levels 1–4. */
function buildHeroGrid(seed: number): HeatGrid {
  const next = seededRandom(seed);
  return buildLevelGrid(HERO_COLUMNS, HERO_ROWS, (): IntensityLevel => {
    if (next() < 0.25) return 0;
    return (1 + Math.floor(next() * 4)) as IntensityLevel;
  });
}

export const HERO_GRID = buildHeroGrid(7);
