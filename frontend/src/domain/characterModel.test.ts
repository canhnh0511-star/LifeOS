import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES } from './insights';
import { ANCHORS, MODEL, project, type Vec3 } from './characterModel';

describe('character wireframe model', () => {
  it('has a body part and an anchor for each of the five areas', () => {
    for (const category of ALL_CATEGORIES) {
      expect(MODEL.filter(line => line.part === category).length).toBeGreaterThan(0);
      expect(ANCHORS[category]).toHaveLength(3);
    }
  });
  it('keeps the figure upright and roughly human-sized (feet near 0, head near 1.8)', () => {
    const ys = MODEL.flatMap(line => line.points.map(p => p[1]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1.9);
    expect(Math.max(...ys)).toBeGreaterThan(1.7);
  });
  it('is mirror-symmetric around x = 0 so the silhouette looks the same from either side', () => {
    const xs = MODEL.flatMap(line => line.points.map(p => p[0]));
    expect(Math.max(...xs)).toBeCloseTo(-Math.min(...xs), 5);
  });
});

describe('mesh continuity', () => {
  it('never draws a line segment that jumps across the body (e.g. between the two legs)', () => {
    for (const line of MODEL) for (let i = 1; i < line.points.length; i++) {
      const a = line.points[i - 1], b = line.points[i];
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(0.22);
    }
  });
  it('connects the rings of every limb with lengthwise lines (a mesh, not floating discs)', () => {
    const lengthwise = MODEL.filter(line => line.points.length === 2);
    expect(lengthwise.length).toBeGreaterThan(150);
    for (const category of ALL_CATEGORIES) expect(lengthwise.some(line => line.part === category)).toBe(true);
  });
});

describe('project', () => {
  const p: Vec3 = [0.3, 1.2, 0.1];
  it('returns to the same screen point after a full turn', () => {
    const a = project(p, 0), b = project(p, Math.PI * 2);
    expect(b.x).toBeCloseTo(a.x, 6); expect(b.y).toBeCloseTo(a.y, 6);
  });
  it('mirrors x after half a turn for a point on the rotation axis plane', () => {
    const front = project([0.3, 1, 0], 0), back = project([0.3, 1, 0], Math.PI);
    expect(back.x).toBeCloseTo(-front.x, 6);
  });
  it('swaps near and far when the figure turns half a turn', () => {
    expect(project([0, 1, 0.2], 0).depth).toBeGreaterThan(0);
    expect(project([0, 1, 0.2], Math.PI).depth).toBeLessThan(0);
  });
  it('puts higher points higher on screen (smaller y) and nearer points larger', () => {
    expect(project([0, 1.7, 0], 0).y).toBeLessThan(project([0, 0.1, 0], 0).y);
    const near = project([0.2, 1, 0.3], 0), far = project([0.2, 1, -0.3], 0);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });
});
