import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES } from './insights';
import { GEAR_NAMES, MAX_GEAR_TIER, equipmentFor, gearTier } from './characterGear';
import type { Vec3 } from './characterModel';

const points = (lines: Vec3[][]) => lines.flat();

describe('gearTier', () => {
  it('maps an area level to a gear tier: starter gear at level 1, capped at the maximum', () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(gearTier)).toEqual([0, 1, 2, 3, 4, 4, 4]);
    expect(MAX_GEAR_TIER).toBe(4);
  });
});

describe('equipmentFor', () => {
  it('has nothing at tier 0 and grows with every tier for each area', () => {
    for (const category of ALL_CATEGORIES) {
      expect(equipmentFor(category, 0)).toEqual([]);
      const counts = [1, 2, 3, 4].map(t => equipmentFor(category, t as 1 | 2 | 3 | 4).length);
      expect(counts[0]).toBeGreaterThan(0);
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    }
  });
  it('keeps each piece on its own body part', () => {
    const range = (category: (typeof ALL_CATEGORIES)[number]) => { const ys = points(equipmentFor(category, 4)).map(p => p[1]); return [Math.min(...ys), Math.max(...ys)]; };
    expect(range('KNOWLEDGE')[0]).toBeGreaterThan(1.5);
    expect(range('CAREER')[0]).toBeGreaterThan(1.2);
    expect(range('MINDFULNESS')[0]).toBeGreaterThan(1.0);
    expect(range('MINDFULNESS')[1]).toBeLessThan(1.6);
    expect(range('CREATIVITY')[0]).toBeGreaterThan(0.5);
    expect(range('CREATIVITY')[1]).toBeLessThan(1.05);
    expect(range('HEALTH')[0]).toBeGreaterThanOrEqual(0);
    expect(range('HEALTH')[1]).toBeLessThan(1.15);
  });
  it('is left/right symmetric so it looks right from every angle', () => {
    for (const category of ALL_CATEGORIES) {
      const xs = points(equipmentFor(category, 4)).map(p => p[0]);
      expect(Math.max(...xs)).toBeCloseTo(-Math.min(...xs), 5);
    }
  });
  it('never draws a segment longer than a limb piece (no stray lines across the figure)', () => {
    for (const category of ALL_CATEGORIES) for (const line of equipmentFor(category, 4)) for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]];
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.32);
    }
  });
  it('names the piece for every area and tier', () => {
    for (const category of ALL_CATEGORIES) for (const t of [1, 2, 3, 4] as const) expect(GEAR_NAMES[category][t].length).toBeGreaterThan(2);
  });
});
