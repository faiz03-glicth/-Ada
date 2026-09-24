import {
  buildSlots,
  clampToSlots,
  distanceToSpan,
  falloff,
  nearestSlot,
  reachFrom,
  slotSpacing,
} from '../tabSlots';

// Four 70pt tabs with the FAB's 84pt slot between the second and third (centres).
const slots = [
  { id: 'home', center: 45, width: 70 },
  { id: 'insights', center: 115, width: 70 },
  { id: 'history', center: 269, width: 70 },
  { id: 'profile', center: 339, width: 70 },
];

describe('tab slots', () => {
  it('finds the nearest tab by centre, across the FAB gap', () => {
    expect(nearestSlot(slots, 0)?.id).toBe('home');
    expect(nearestSlot(slots, 100)?.id).toBe('insights');
    // The FAB sits at 192: 191 is closer to Insights (76) than History (78), 193 the other way.
    expect(nearestSlot(slots, 191)?.id).toBe('insights');
    expect(nearestSlot(slots, 193)?.id).toBe('history');
    expect(nearestSlot([], 50)).toBeNull();
  });

  it('keeps a drag between the first and last tab centre', () => {
    expect(clampToSlots(slots, -40)).toBe(45);
    expect(clampToSlots(slots, 120)).toBe(120);
    expect(clampToSlots(slots, 900)).toBe(339);
    expect(clampToSlots([], 42)).toBe(42);
  });

  it('measures stretch and magnification in neighbouring-tab spacing', () => {
    expect(slotSpacing(slots)).toBe(70);
    expect(slotSpacing([{ id: 'only', center: 50, width: 64 }])).toBe(64);
    expect(slotSpacing([])).toBe(1);
  });

  it('measures distance to the liquid as a span, zero anywhere under it', () => {
    expect(distanceToSpan(100, 80, 140)).toBe(0);
    expect(distanceToSpan(100, 140, 80)).toBe(0);
    expect(distanceToSpan(60, 80, 140)).toBe(20);
    expect(distanceToSpan(160, 140, 80)).toBe(20);
  });

  it('magnification falls off smoothly with distance and stops one tab away', () => {
    const weights = [0, 0.25, 0.5, 0.75, 1, 1.5].map((d) => falloff(d * 70, 70, 1.3));
    expect(weights[0]).toBe(1);
    for (let i = 1; i < weights.length; i += 1) expect(weights[i]).toBeLessThanOrEqual(weights[i - 1] ?? 1);
    expect(weights[4]).toBe(0);
    expect(weights[5]).toBe(0);
    // With a 0.2 peak boost: 1.20× under the liquid, ~1.08× half a tab away.
    expect(1 + 0.2 * (weights[2] ?? 0)).toBeCloseTo(1.08, 2);
  });
});

describe('liquid sizing and reach', () => {
  const frames = {
    home: { x: 6, y: 6, width: 58, height: 52 },
    insights: { x: 64, y: 6, width: 58, height: 52 },
  };
  const metrics = { padX: 14, minWidth: 64, overhang: 6 };

  it('wraps each tab’s content with padding, within a minimum and the tab plus its overhang', () => {
    const slots = buildSlots(
      ['home', 'insights', 'history'],
      frames,
      { home: { width: 30, height: 40 }, insights: { width: 48, height: 40 } },
      metrics,
    );
    // Home: 30 + 28 = 58 → raised to the 64 minimum. Insights: 48 + 28 = 76 → capped at 58 + 12 = 70,
    // still 11pt clear of its 48pt label on each side. History isn't measured yet, so it has no slot.
    expect(slots).toEqual([
      { id: 'home', center: 35, width: 64 },
      { id: 'insights', center: 93, width: 70 },
    ]);
  });

  it('falls back to the tab width until the content has been measured', () => {
    expect(buildSlots(['home'], frames, {}, metrics)).toEqual([{ id: 'home', center: 35, width: 64 }]);
  });

  it('never draws the tail more than maxGap behind the head (one body, no ghost bubble)', () => {
    expect(reachFrom(300, 40, 56)).toBe(244);
    expect(reachFrom(40, 300, 56)).toBe(96);
    expect(reachFrom(100, 80, 56)).toBe(80);
  });
});
