import type { GoalCategory } from '../api/types';
import type { Vec3 } from './characterModel';

export type GearTier = 0 | 1 | 2 | 3 | 4;
export const MAX_GEAR_TIER = 4;
/** Level 1 already wears starter gear; each further level upgrades the piece until the last tier. */
export const gearTier = (level: number): GearTier => Math.max(0, Math.min(MAX_GEAR_TIER, Math.floor(level))) as GearTier;

export const GEAR_NAMES: Record<GoalCategory, Record<1 | 2 | 3 | 4, string>> = {
  KNOWLEDGE: { 1: 'Vòng trí tuệ', 2: 'Mũ học giả', 3: 'Mũ giáp có mào', 4: 'Mũ giáp cánh' },
  CAREER: { 1: 'Đệm vai', 2: 'Giáp vai', 3: 'Giáp vai gai', 4: 'Giáp vai kèm gorget' },
  MINDFULNESS: { 1: 'Mặt dây chuyền', 2: 'Giáp ngực', 3: 'Giáp ngực ngọc', 4: 'Giáp ngực hào quang' },
  CREATIVITY: { 1: 'Vòng cổ tay', 2: 'Găng giáp', 3: 'Găng ngọc cầu', 4: 'Găng quỹ đạo' },
  HEALTH: { 1: 'Giày', 2: 'Giáp gối', 3: 'Đai lưng', 4: 'Giày cánh' }
};

type Line = Vec3[];
const SIDES = 16;
const ring = (cx: number, y: number, cz: number, rx: number, rz: number): Line =>
  Array.from({ length: SIDES + 1 }, (_, i) => { const a = (i / SIDES) * Math.PI * 2; return [cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz] as Vec3; });
/** Ring standing in the x-y plane (faces the viewer), for halos and orbits. */
const vring = (cx: number, cy: number, cz: number, r: number): Line =>
  Array.from({ length: SIDES + 1 }, (_, i) => { const a = (i / SIDES) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz] as Vec3; });
/** Octahedron outline: a cut gem. */
function gem(cx: number, cy: number, cz: number, r: number): Line[] {
  const top: Vec3 = [cx, cy + r * 1.3, cz], bottom: Vec3 = [cx, cy - r * 1.3, cz];
  const eq: Vec3[] = [[cx + r, cy, cz], [cx, cy, cz + r], [cx - r, cy, cz], [cx, cy, cz - r]];
  return [...eq.map(p => [top, p]), ...eq.map(p => [bottom, p]), [...eq, eq[0]]];
}
const mirror = (lines: Line[]): Line[] => lines.map(l => l.map(([x, y, z]) => [-x, y, z] as Vec3));
const both = (lines: Line[]): Line[] => [...lines, ...mirror(lines)];

// Proportions mirror characterModel.ts (male build): shoulder line 0.26, arm x 0.275 -> 0.365, leg x 0.095.
function head(tier: number): Line[] {
  const out: Line[] = [ring(0, 1.715, 0.015, 0.101, 0.114), ring(0, 1.7, 0.015, 0.1, 0.113)];
  if (tier >= 2) {
    out.push(ring(0, 1.745, 0.017, 0.095, 0.106), ring(0, 1.77, 0.018, 0.072, 0.082), ring(0, 1.79, 0.02, 0.04, 0.05));
    for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) { const t = (a / 8) * Math.PI * 2; out.push([[Math.cos(t) * 0.101, 1.715, 0.015 + Math.sin(t) * 0.114], [Math.cos(t) * 0.04, 1.795, 0.02 + Math.sin(t) * 0.05]]); }
  }
  if (tier >= 3) for (const dx of [-0.014, 0, 0.014]) out.push([[dx, 1.72, 0.13], [dx, 1.78, 0.1], [dx, 1.83, 0.04], [dx, 1.84, -0.02], [dx, 1.79, -0.08], [dx, 1.71, -0.115]]);
  if (tier >= 4) out.push(...both([[[0.1, 1.73, 0], [0.16, 1.79, -0.01], [0.215, 1.86, -0.03]], [[0.1, 1.71, -0.01], [0.17, 1.74, -0.03], [0.225, 1.78, -0.06]], [[0.1, 1.69, -0.02], [0.16, 1.69, -0.05], [0.2, 1.7, -0.09]]]));
  return out;
}
function shoulders(tier: number): Line[] {
  const side: Line[] = [ring(0.275, 1.4, 0, 0.088, 0.088), ring(0.28, 1.375, 0, 0.094, 0.094)];
  if (tier >= 2) side.push(ring(0.285, 1.35, 0, 0.098, 0.098), ring(0.29, 1.325, 0, 0.09, 0.09), ring(0.272, 1.425, 0, 0.06, 0.06));
  if (tier >= 3) for (const z of [-0.045, 0, 0.045]) side.push([[0.275, 1.43, z], [0.292, 1.53, z * 0.8]]);
  const out = both(side);
  if (tier >= 4) out.push(ring(0, 1.43, 0, 0.14, 0.1), ring(0, 1.455, 0, 0.095, 0.078), ...[-0.1, -0.05, 0.05, 0.1].map(x => [[x, 1.43, 0.095], [x * 0.7, 1.36, 0.115]] as Line));
  return out;
}
function chest(tier: number): Line[] {
  const out: Line[] = [[[-0.055, 1.455, 0.06], [-0.02, 1.33, 0.12], [0, 1.285, 0.13], [0.02, 1.33, 0.12], [0.055, 1.455, 0.06]], ...gem(0, 1.265, 0.135, 0.022)];
  if (tier >= 2) {
    out.push(ring(0, 1.345, 0, 0.255, 0.13), ring(0, 1.285, 0, 0.24, 0.13), ring(0, 1.22, 0, 0.21, 0.122), ring(0, 1.16, 0, 0.18, 0.108));
    for (const x of [-0.18, -0.09, 0, 0.09, 0.18]) out.push([[x, 1.345, 0.125], [x * 0.85, 1.16, 0.105]]);
  }
  if (tier >= 3) out.push(...gem(0, 1.26, 0.15, 0.04));
  if (tier >= 4) {
    out.push(vring(0, 1.28, -0.14, 0.22), vring(0, 1.28, -0.14, 0.17));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; out.push([[Math.cos(a) * 0.17, 1.28 + Math.sin(a) * 0.17, -0.14], [Math.cos(a) * 0.22, 1.28 + Math.sin(a) * 0.22, -0.14]]); }
  }
  return out;
}
function hands(tier: number): Line[] {
  const side: Line[] = [ring(0.358, 0.825, 0, 0.046, 0.046), ring(0.356, 0.8, 0, 0.044, 0.044)];
  if (tier >= 2) side.push(ring(0.31, 0.95, 0, 0.056, 0.056), ring(0.315, 0.91, 0, 0.057, 0.057), ring(0.32, 0.87, 0, 0.054, 0.054));
  if (tier >= 3) side.push(...gem(0.366, 0.64, 0.05, 0.028));
  if (tier >= 4) side.push(ring(0.366, 0.64, 0.05, 0.075, 0.075), vring(0.366, 0.64, 0.05, 0.075), [[0.366, 0.72, 0.05], [0.366, 0.68, 0.05]]);
  return both(side);
}
function legs(tier: number): Line[] {
  const side: Line[] = [ring(0.095, 0.27, 0, 0.064, 0.07), ring(0.095, 0.2, 0, 0.06, 0.066), ring(0.095, 0.14, 0, 0.056, 0.062), ring(0.095, 0.085, 0.01, 0.056, 0.08), ring(0.095, 0.035, 0.045, 0.046, 0.085)];
  if (tier >= 2) side.push(ring(0.095, 0.55, 0.012, 0.074, 0.08), ring(0.095, 0.5, 0.014, 0.078, 0.084), ring(0.095, 0.45, 0.012, 0.072, 0.078), ring(0.095, 0.36, 0, 0.07, 0.074));
  const out = both(side);
  if (tier >= 3) out.push(ring(0, 1.065, 0, 0.18, 0.108), ring(0, 1.03, 0, 0.18, 0.108), ...gem(0, 1.05, 0.118, 0.02));
  if (tier >= 4) out.push(...both([ring(0.095, 0.012, 0.04, 0.1, 0.13), [[0.15, 0.1, -0.02], [0.2, 0.19, -0.1]], [[0.15, 0.07, -0.02], [0.215, 0.13, -0.11]]]));
  return out;
}
const PIECES: Record<GoalCategory, (tier: number) => Line[]> = { KNOWLEDGE: head, CAREER: shoulders, MINDFULNESS: chest, CREATIVITY: hands, HEALTH: legs };

/** Glowing equipment for one area at a tier (0 = none). Each tier adds to the previous one. */
export function equipmentFor(category: GoalCategory, tier: GearTier): Line[] {
  return tier <= 0 ? [] : PIECES[category](tier);
}
