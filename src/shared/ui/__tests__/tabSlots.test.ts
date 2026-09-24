import { clampToSlots, nearestSlot } from '../tabSlots';

const slots = [
  { id: 'home', x: 10, width: 70 },
  { id: 'insights', x: 80, width: 70 },
  { id: 'history', x: 234, width: 70 },
  { id: 'profile', x: 304, width: 70 },
];

describe('tab slots', () => {
  it('finds the nearest tab, skipping the FAB gap', () => {
    expect(nearestSlot(slots, 0)?.id).toBe('home');
    expect(nearestSlot(slots, 100)?.id).toBe('insights');
    // Across the FAB gap the nearer edge wins: 150 is 70 from Insights, 84 from History.
    expect(nearestSlot(slots, 150)?.id).toBe('insights');
    expect(nearestSlot(slots, 170)?.id).toBe('history');
    expect(nearestSlot([], 50)).toBeNull();
  });

  it('keeps a drag between the first and last tab', () => {
    expect(clampToSlots(slots, -40)).toBe(10);
    expect(clampToSlots(slots, 120)).toBe(120);
    expect(clampToSlots(slots, 900)).toBe(304);
    expect(clampToSlots([], 42)).toBe(42);
  });
});
