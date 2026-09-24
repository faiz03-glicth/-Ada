import { buildLevelGrid } from '../grid';
import { INTENSITY_LEVELS, intensityLevel } from '../intensity';

describe('intensityLevel', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
    [6, 4],
    [99, 4],
  ])('%i check-ins → level %i', (count, level) => {
    expect(intensityLevel(count)).toBe(level);
  });

  it('treats negative and non-numeric counts as no activity', () => {
    expect(intensityLevel(-1)).toBe(0);
    expect(intensityLevel(Number.NaN)).toBe(0);
  });
});

describe('INTENSITY_LEVELS', () => {
  it('describes each level in order with its range', () => {
    expect(INTENSITY_LEVELS.map((l) => [l.level, l.name, l.rangeLabel])).toEqual([
      [0, 'No activity', '0 check-ins'],
      [1, 'Light', '1 check-in'],
      [2, 'Moderate', '2–3 check-ins'],
      [3, 'Strong', '4–5 check-ins'],
      [4, 'Peak', '6+ check-ins'],
    ]);
  });
});

describe('buildLevelGrid', () => {
  it('builds columns of rows in column-major order', () => {
    const order: string[] = [];
    const grid = buildLevelGrid(2, 3, (c, r) => {
      order.push(`${c}${r}`);
      return 1;
    });
    expect(grid.columns).toHaveLength(2);
    expect(grid.columns[0]).toHaveLength(3);
    expect(order).toEqual(['00', '01', '02', '10', '11', '12']);
  });
});
