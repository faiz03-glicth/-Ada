import {
  buildSlots,
  clampToSlots,
  labelLimits,
  roomAround,
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
  // A 360pt phone: 4pt bar padding, 63pt tabs, the 68pt + slot (64pt button) between Insights and History.
  const frames = {
    home: { x: 4, y: 5, width: 63, height: 58 },
    insights: { x: 67, y: 5, width: 63, height: 58 },
    history: { x: 198, y: 5, width: 63, height: 58 },
  };
  const geometry = { bounds: { left: 0, right: 328 }, obstacles: [{ left: 132, right: 196 }] };
  const metrics = { padX: 12, minWidth: 56, gap: 3 };

  it('wraps each tab’s content with padding, above a preferred minimum', () => {
    const slots = buildSlots(['home'], frames, { home: { width: 30, height: 43 } }, geometry, metrics);
    // 30 + 24 = 54 → the 56 minimum.
    expect(slots).toEqual([{ id: 'home', center: 35.5, width: 56 }]);
  });

  it('never reaches the + button, the bar’s end or a neighbour’s content', () => {
    const slots = buildSlots(
      ['home', 'insights'],
      frames,
      { home: { width: 50, height: 43 }, insights: { width: 44, height: 43 } },
      geometry,
      metrics,
    );
    // Home: 50 + 24 = 74 wanted, but the bar's left end is 35.5 away (−3 clearance) → 65.
    // Insights: 68 wanted; the + button starts 33.5 to its right (−3) → 61, still 8.5pt clear of its label.
    expect(slots).toEqual([
      { id: 'home', center: 35.5, width: 65 },
      { id: 'insights', center: 98.5, width: 61 },
    ]);
  });

  it('limits labels so the liquid can always wrap them with padding (they shrink instead of touching)', () => {
    const limits = labelLimits(['home', 'insights', 'history'], frames, geometry, metrics, 24);
    // Insights: 30.5pt of room to the + button, minus 12pt padding, both sides → 37pt of label.
    expect(limits.insights).toBe(37);
    expect(limits.history).toBe(37);
    expect(limits.home).toBe(41);
  });

  it('falls back to the tab width until the content has been measured', () => {
    expect(buildSlots(['home'], frames, {}, geometry, metrics)).toEqual([
      { id: 'home', center: 35.5, width: 63 },
    ]);
  });

  it('measures room around a point, zero when there is none', () => {
    expect(roomAround(50, { bounds: { left: 0, right: 100 }, obstacles: [] }, [], 0)).toBe(50);
    expect(
      roomAround(50, { bounds: { left: 0, right: 100 }, obstacles: [{ left: 55, right: 70 }] }, [], 3),
    ).toBe(2);
    expect(
      roomAround(50, { bounds: { left: 0, right: 100 }, obstacles: [{ left: 51, right: 70 }] }, [], 3),
    ).toBe(0);
  });

  it('never draws the tail more than maxGap behind the head (one body, no ghost bubble)', () => {
    expect(reachFrom(300, 40, 56)).toBe(244);
    expect(reachFrom(40, 300, 56)).toBe(96);
    expect(reachFrom(100, 80, 56)).toBe(80);
  });
});
