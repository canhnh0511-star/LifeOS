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
const sec = (cx: number, y: number, rx: number, rz: number, part: GoalCategory, cz = 0): Section => ({ cx, y, cz, rx, rz, part });
const mirrorSections = (tube: Section[]): Section[] => tube.map(s => ({ ...s, cx: -s.cx }));
const mid = (a: Section, b: Section): Section => ({ cx: (a.cx + b.cx) / 2, y: (a.y + b.y) / 2, cz: (a.cz + b.cz) / 2, rx: (a.rx + b.rx) / 2, rz: (a.rz + b.rz) / 2, part: a.part });
/** Doubles the number of sections so the mesh looks smooth between key poses. */
const subdivide = (tube: Section[]): Section[] => tube.flatMap((s, i) => i < tube.length - 1 ? [s, mid(s, tube[i + 1])] : [s]);

const torsoPart = (y: number): GoalCategory => y >= 1.38 ? 'CAREER' : y >= 1.15 ? 'MINDFULNESS' : 'HEALTH';
const armPart = (y: number): GoalCategory => y >= 1.3 ? 'CAREER' : 'CREATIVITY';

function tubes(): Section[][] {
  const head: Section[] = [];
  for (let i = -3; i <= 3; i++) { const t = i / 3.6; const r = Math.sqrt(1 - t * t); head.push(sec(0, 1.64 + t * 0.14, 0.1 * r, 0.115 * r, 'KNOWLEDGE', 0.01)); }
  const torso = ([[1.5, 0.05, 0.05], [1.44, 0.07, 0.065], [1.4, 0.215, 0.1], [1.32, 0.21, 0.115], [1.22, 0.185, 0.11], [1.1, 0.155, 0.095], [1.0, 0.17, 0.1], [0.92, 0.18, 0.105]] as const)
    .map(([y, rx, rz]) => sec(0, y, rx, rz, torsoPart(y)));
  const leg = ([[0.9, 0.085], [0.72, 0.078], [0.52, 0.06], [0.36, 0.062], [0.16, 0.042], [0.03, 0.04]] as const)
    .map(([y, r]) => sec(0.095, y, r, r * 1.05, 'HEALTH'));
  const arm = ([[1.38, 0.255, 0.052], [1.2, 0.285, 0.046], [1.0, 0.31, 0.04], [0.85, 0.325, 0.034], [0.76, 0.33, 0.045], [0.7, 0.332, 0.03]] as const)
    .map(([y, x, r]) => sec(x, y, r, r, armPart(y)));
  return [head, torso, leg, mirrorSections(leg), arm, mirrorSections(arm)].map(subdivide);
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
  KNOWLEDGE: [0, 1.68, 0.1],
  CAREER: [-0.22, 1.4, 0.08],
  MINDFULNESS: [0.05, 1.27, 0.11],
  CREATIVITY: [0.332, 0.74, 0.03],
  HEALTH: [-0.095, 0.52, 0.06]
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
