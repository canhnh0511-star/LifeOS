import type { GoalCategory } from '../api/types';

export type Vec3 = [number, number, number];
export interface ModelLine { part: GoalCategory; points: Vec3[]; }
export interface Projected { x: number; y: number; depth: number; }

/**
 * Low-poly humanoid built from elliptical rings (lofted tubes), in metres with y up and feet on y = 0.
 * Each ring is a closed polyline tagged with the area it represents, so hovering a stat can light its body part.
 * Mapping: head = KNOWLEDGE, shoulders = CAREER, chest = MINDFULNESS, arms/hands = CREATIVITY, core/legs = HEALTH.
 */
const SIDES = 14;
const ring = (cx: number, y: number, cz: number, rx: number, rz: number): Vec3[] =>
  Array.from({ length: SIDES + 1 }, (_, i) => { const a = (i / SIDES) * Math.PI * 2; return [cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz] as Vec3; });

/** One cross-section of a tube: centre, radii and the area its surface belongs to. */
interface Section { cx: number; y: number; cz: number; rx: number; rz: number; part: GoalCategory; }
/** Key pose: [y, rx, rz, cx, cz]. Poses are blended with a Catmull-Rom curve so outlines flow instead of stepping. */
type Key = readonly [number, number, number, number, number];
const CR = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
function smooth(keys: readonly Key[], per: number, partAt: (y: number) => GoalCategory): Section[] {
  const out: Section[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    for (let j = 0; j < per; j++) {
      const t = j / per; const f = (n: number) => CR(k0[n], k1[n], k2[n], k3[n], t);
      out.push({ y: f(0), rx: Math.max(0.004, f(1)), rz: Math.max(0.004, f(2)), cx: f(3), cz: f(4), part: partAt(f(0)) });
    }
  }
  const last = keys[keys.length - 1];
  out.push({ y: last[0], rx: last[1], rz: last[2], cx: last[3], cz: last[4], part: partAt(last[0]) });
  return out;
}
const mirror = (tube: Section[]): Section[] => tube.map(s => ({ ...s, cx: -s.cx }));

/** Landmarks the tests (and tuning) rely on: the head sits into the neck, the arm starts inside the shoulder line. */
export const PROPORTIONS = { headBottom: 1.52, neckTop: 1.57, shoulderHalfWidth: 0.26, armStartX: 0.275 } as const;

const torsoPart = (y: number): GoalCategory => y >= 1.38 ? 'CAREER' : y >= 1.15 ? 'MINDFULNESS' : 'HEALTH';
const armPart = (y: number): GoalCategory => y >= 1.3 ? 'CAREER' : 'CREATIVITY';
const arm = (r: number): [number, number] => [r, r];

function tubes(): Section[][] {
  // Male build: squarer jaw, thick neck, broad shoulders tapering to a narrower waist and hips, heavier arms and legs.
  const head = smooth([
    [1.805, 0.012, 0.014, 0, 0.02], [1.785, 0.058, 0.068, 0, 0.02], [1.745, 0.089, 0.1, 0, 0.018], [1.69, 0.097, 0.109, 0, 0.015],
    [1.63, 0.094, 0.106, 0, 0.018], [1.58, 0.082, 0.093, 0, 0.025], [1.545, 0.058, 0.07, 0, 0.03], [PROPORTIONS.headBottom, 0.04, 0.05, 0, 0.03]
  ], 3, () => 'KNOWLEDGE');
  // Neck rises into the head, then widens along the trapezius slope into the shoulders before tapering to the hips.
  const torso = smooth([
    [PROPORTIONS.neckTop, 0.055, 0.057, 0, 0], [1.5, 0.06, 0.06, 0, 0.005], [1.46, 0.07, 0.064, 0, 0.005], [1.435, 0.105, 0.078, 0, 0],
    [1.415, 0.165, 0.09, 0, 0], [1.395, 0.225, 0.104, 0, 0], [1.37, PROPORTIONS.shoulderHalfWidth, 0.11, 0, 0], [1.33, 0.25, 0.122, 0, 0.004],
    [1.28, 0.235, 0.125, 0, 0.008], [1.2, 0.2, 0.115, 0, 0.005], [1.12, 0.17, 0.1, 0, 0], [1.05, 0.162, 0.096, 0, 0],
    [0.98, 0.172, 0.102, 0, 0], [0.92, 0.176, 0.106, 0, 0], [0.88, 0.17, 0.1, 0, 0]
  ], 3, torsoPart);
  // Leg: thigh, knee, calf, ankle, then a foot that points forward.
  const leg = smooth([
    [0.95, 0.092, 0.098, 0.095, 0], [0.86, 0.093, 0.1, 0.095, 0], [0.74, 0.083, 0.092, 0.095, 0], [0.6, 0.066, 0.074, 0.095, 0],
    [0.5, 0.06, 0.068, 0.095, 0], [0.4, 0.064, 0.072, 0.095, 0], [0.28, 0.05, 0.058, 0.095, 0], [0.14, 0.041, 0.046, 0.095, 0],
    [0.07, 0.037, 0.041, 0.095, 0], [0.045, 0.038, 0.056, 0.095, 0.02], [0.025, 0.041, 0.082, 0.095, 0.045], [0.008, 0.037, 0.092, 0.095, 0.05], [0.0, 0.031, 0.076, 0.095, 0.05]
  ], 2, () => 'HEALTH');
  // Arm: deltoid inside the shoulder, bicep, elbow, forearm, wrist, then a mitten-shaped hand.
  const armKeys: [number, number, number][] = [
    [1.39, 0.06, PROPORTIONS.armStartX], [1.35, 0.075, 0.29], [1.29, 0.068, 0.303], [1.2, 0.058, 0.315], [1.12, 0.05, 0.325], [1.04, 0.052, 0.337],
    [0.95, 0.046, 0.349], [0.86, 0.036, 0.358], [0.8, 0.033, 0.362], [0.77, 0.04, 0.364], [0.73, 0.045, 0.366], [0.69, 0.04, 0.367], [0.65, 0.027, 0.367], [0.625, 0.009, 0.367]
  ];
  const armTube = smooth(armKeys.map(([y, r, x]) => [y, ...arm(r), x, 0] as const), 2, armPart);
  return [head, torso, leg, mirror(leg), armTube, mirror(armTube)];
}

function buildModel(): ModelLine[] {
  const lines: ModelLine[] = [];
  for (const tube of tubes()) {
    const rings = tube.map(s => ring(s.cx, s.y, s.cz, s.rx, s.rz));
    tube.forEach((s, i) => lines.push({ part: s.part, points: rings[i] }));
    // Lengthwise lines only join neighbouring rings of the same tube, so nothing can jump between limbs.
    for (let i = 0; i < tube.length - 1; i++) for (let k = 0; k < SIDES; k += 2) lines.push({ part: tube[i].part, points: [rings[i][k], rings[i + 1][k]] });
  }
  return lines;
}

export const MODEL: ModelLine[] = buildModel();

/** Where each stat's leader line lands on the body. */
export const ANCHORS: Record<GoalCategory, Vec3> = {
  KNOWLEDGE: [0, 1.68, 0.11],
  CAREER: [-0.26, 1.38, 0.09],
  MINDFULNESS: [0.04, 1.26, 0.115],
  CREATIVITY: [0.367, 0.73, 0.045],
  HEALTH: [-0.095, 0.5, 0.07]
};

const PITCH = 0.14;      // slight look-down so ring ellipses read as 3D
const CAMERA = 3.2;      // distance for perspective
/** Rotates around the vertical axis by `angle` and projects to unit-height screen space (x right, y down, 1 unit = 1 m at depth 0). */
export function project([x, y, z]: Vec3, angle: number): Projected {
  const c = Math.cos(angle), s = Math.sin(angle);
  const rx = x * c + z * s, rz = -x * s + z * c;
  const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const ry = (y - 0.95) * cp - rz * sp, rz2 = (y - 0.95) * sp + rz * cp;
  const k = CAMERA / (CAMERA - rz2);
  return { x: rx * k, y: -ry * k, depth: rz2 };
}
