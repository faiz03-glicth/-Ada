import type { IntensityLevel } from './intensity';

export type HeatCellState = 'default' | 'today' | 'selected' | 'future' | 'blank';

export interface HeatGridCell {
  /** Stable key; an ISO date (YYYY-MM-DD) for real days. */
  key: string;
  level: IntensityLevel;
  state: HeatCellState;
  /** Spoken label for interactive cells, e.g. "Sep 24: 3 check-ins". */
  label?: string;
}

/** Columns are weeks; each column holds up to 7 day cells, top to bottom. */
export interface HeatGrid {
  columns: readonly (readonly HeatGridCell[])[];
}

/** PURE: builds a grid column by column (the same order the cells animate in). */
export function buildLevelGrid(
  columns: number,
  rows: number,
  levelAt: (column: number, row: number) => IntensityLevel,
): HeatGrid {
  return {
    columns: Array.from({ length: columns }, (_, column) =>
      Array.from({ length: rows }, (_, row) => ({
        key: `${column}-${row}`,
        level: levelAt(column, row),
        state: 'default' as const,
      })),
    ),
  };
}
