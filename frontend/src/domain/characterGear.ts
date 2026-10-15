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
const TAU = Math.PI * 2;
const ring = (cx: number, y: number, cz: number, rx: number, rz: number, sides = 16): Line =>
  Array.from({ length: sides + 1 }, (_, i) => { const a = (i / sides) * TAU; return [cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz] as Vec3; });
/** Ring standing in the x-y plane (faces the viewer), for halos and orbits. */
const vring = (cx: number, cy: number, cz: number, r: number): Line =>
  Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * TAU; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz] as Vec3; });
/** Octahedron outline: a cut gem. */
function gem(cx: number, cy: number, cz: number, r: number): Line[] {
  const top: Vec3 = [cx, cy + r * 1.3, cz], bottom: Vec3 = [cx, cy - r * 1.3, cz];
  const eq: Vec3[] = [[cx + r, cy, cz], [cx, cy, cz + r], [cx - r, cy, cz], [cx, cy, cz - r]];
  return [...eq.map(p => [top, p]), ...eq.map(p => [bottom, p]), [...eq, eq[0]]];
}
const mirror = (lines: Line[]): Line[] => lines.map(l => l.map(([x, y, z]) => [-x, y, z] as Vec3));
const both = (lines: Line[]): Line[] => [...lines, ...mirror(lines)];

/** Key pose of a shell: [y, rx, rz, cx, cz], blended with a Catmull-Rom curve. */
type Key = readonly [number, number, number, number, number];
const CR = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
interface ShellOptions { per?: number; /** arc in radians around +x (z is sin); default full circle */ arc?: [number, number]; sides?: number; meridians?: number; }
/**
 * Armour plating: a surface lofted over key poses and drawn the same way as the body mesh (rings plus lengthwise
 * lines). Plates hug the body a few millimetres outside it, so they read as worn armour, not floating hoops.
 */
function shell(keys: readonly Key[], { per = 2, arc = [0, TAU], sides = 16, meridians = 2 }: ShellOptions = {}): Line[] {
  const sections: number[][] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    for (let j = 0; j < per; j++) sections.push([0, 1, 2, 3, 4].map(n => CR(k0[n], k1[n], k2[n], k3[n], j / per)));
  }
  sections.push([...keys[keys.length - 1]]);
  const closed = Math.abs(arc[1] - arc[0] - TAU) < 1e-6;
  const rings = sections.map(([y, rx, rz, cx, cz]) => Array.from({ length: sides + 1 }, (_, i) => {
    const a = arc[0] + (i / sides) * (arc[1] - arc[0]);
    return [cx + Math.cos(a) * Math.max(0.003, rx), y, cz + Math.sin(a) * Math.max(0.003, rz)] as Vec3;
  }));
  const lines: Line[] = [...rings];
  const last = closed ? sides - 1 : sides;
  for (let r = 0; r < rings.length - 1; r++) for (let k = 0; k <= last; k += meridians) lines.push([rings[r][k], rings[r + 1][k]]);
  return lines;
}
const FRONT: [number, number] = [Math.PI * 0.14, Math.PI * 0.86];

/** Cone spike: a small base ring joined to an apex. */
const spike = (cx: number, baseY: number, tipY: number, cz: number, r: number): Line[] => {
  const base = ring(cx, baseY, cz, r, r, 6);
  return [base, ...base.slice(0, 6).map((p): Line => [p, [cx, tipY, cz]])];
};
/** A blade/feather swept from a root: polyline plus a closing outline so it reads as a flat plate. */
const feather = (root: Vec3, tip: Vec3, width: number): Line[] => {
  const mid: Vec3 = [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2 + width, (root[2] + tip[2]) / 2];
  const mid2: Vec3 = [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2 - width, (root[2] + tip[2]) / 2];
  return [[root, mid, tip, mid2, root]];
};

// Proportions mirror characterModel.ts (male build): shoulder line 0.26, arm x 0.275 -> 0.367, leg x 0.095.
function head(tier: number): Line[] {
  const out: Line[] = [];
  // Circlet: a snug band around the brow with a stone in front.
  out.push(...shell([[1.735, 0.1, 0.113, 0, 0.016], [1.715, 0.103, 0.116, 0, 0.016], [1.695, 0.102, 0.115, 0, 0.016]], { per: 1, sides: 20, meridians: 1 }), ...gem(0, 1.715, 0.133, 0.014));
  if (tier >= 2) out.push(...shell([[1.735, 0.1, 0.113, 0, 0.016], [1.762, 0.088, 0.1, 0, 0.018], [1.79, 0.058, 0.07, 0, 0.02], [1.812, 0.012, 0.016, 0, 0.02]], { per: 2, sides: 20, meridians: 1 }));
  if (tier >= 3) {
    // Cheek guards and a crest fin running front to back.
    out.push(...both(shell([[1.7, 0.1, 0.113, 0, 0.016], [1.66, 0.1, 0.112, 0, 0.018], [1.62, 0.092, 0.104, 0, 0.022]], { per: 2, arc: [-0.35, 0.55], sides: 6, meridians: 1 })));
    const crest = (dx: number): Vec3[] => [[dx, 1.725, 0.125], [dx, 1.79, 0.095], [dx, 1.86, 0.04], [dx, 1.875, -0.02], [dx, 1.83, -0.085], [dx, 1.72, -0.118]];
    const [left, middle, right] = [crest(-0.012), crest(0), crest(0.012)];
    out.push(left, middle, right, ...left.map((p, i): Line => [p, right[i]]));
  }
  if (tier >= 4) out.push(...both([
    ...feather([0.1, 1.74, -0.005], [0.26, 1.9, -0.05], 0.022), ...feather([0.1, 1.72, -0.012], [0.27, 1.8, -0.07], 0.022), ...feather([0.1, 1.7, -0.02], [0.25, 1.7, -0.09], 0.02)
  ]));
  return out;
}
function shoulders(tier: number): Line[] {
  // Rounded cap over the deltoid.
  const cap: Key[] = [[1.445, 0.03, 0.03, 0.278, 0], [1.428, 0.07, 0.07, 0.278, 0], [1.4, 0.088, 0.088, 0.279, 0], [1.37, 0.094, 0.094, 0.281, 0], [1.34, 0.09, 0.09, 0.284, 0]];
  const side: Line[] = shell(cap, { per: 2, sides: 16, meridians: 2 });
  if (tier >= 2) {
    // Layered plates cascading down the upper arm.
    side.push(...shell([[1.34, 0.094, 0.094, 0.286, 0], [1.31, 0.1, 0.1, 0.29, 0], [1.28, 0.094, 0.094, 0.294, 0]], { per: 2, sides: 16, meridians: 2 }));
    side.push(...shell([[1.28, 0.088, 0.088, 0.296, 0], [1.25, 0.092, 0.092, 0.3, 0], [1.225, 0.082, 0.082, 0.303, 0]], { per: 1, sides: 16, meridians: 2 }));
  }
  if (tier >= 3) for (const [dx, dz] of [[0, 0], [-0.045, 0.03], [0.045, 0.03], [-0.045, -0.03], [0.045, -0.03]] as const) side.push(...spike(0.278 + dx, 1.43, 1.53, dz, 0.014));
  const out = both(side);
  if (tier >= 4) out.push(...shell([[1.475, 0.1, 0.082, 0, 0], [1.452, 0.12, 0.092, 0, 0.004], [1.425, 0.15, 0.105, 0, 0.004], [1.4, 0.165, 0.112, 0, 0.004]], { per: 2, sides: 24, meridians: 2 }));
  return out;
}
function chest(tier: number): Line[] {
  const out: Line[] = [[[-0.058, 1.452, 0.062], [-0.03, 1.36, 0.118], [-0.012, 1.3, 0.134], [0, 1.285, 0.138], [0.012, 1.3, 0.134], [0.03, 1.36, 0.118], [0.058, 1.452, 0.062]], ...gem(0, 1.262, 0.14, 0.024)];
  if (tier >= 2) {
    // Breastplate: a front-facing shell with a central ridge.
    out.push(...shell([[1.37, 0.262, 0.136, 0, 0.006], [1.33, 0.256, 0.138, 0, 0.01], [1.28, 0.242, 0.14, 0, 0.012], [1.22, 0.208, 0.13, 0, 0.008], [1.16, 0.178, 0.116, 0, 0.004]], { per: 2, arc: FRONT, sides: 14, meridians: 1 }));
    out.push([[0, 1.37, 0.146], [0, 1.28, 0.153], [0, 1.16, 0.12]]);
  }
  if (tier >= 3) out.push(...gem(0, 1.262, 0.158, 0.042), ...shell([[1.38, 0.268, 0.142, 0, 0.004], [1.372, 0.264, 0.14, 0, 0.004]], { per: 1, arc: FRONT, sides: 14, meridians: 2 }));
  if (tier >= 4) {
    out.push(vring(0, 1.28, -0.15, 0.2), vring(0, 1.28, -0.15, 0.15));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; out.push([[Math.cos(a) * 0.15, 1.28 + Math.sin(a) * 0.15, -0.15], [Math.cos(a) * 0.2, 1.28 + Math.sin(a) * 0.2, -0.15]]); }
  }
  return out;
}
function hands(tier: number): Line[] {
  const side: Line[] = shell([[0.865, 0.044, 0.044, 0.357, 0], [0.84, 0.046, 0.046, 0.359, 0], [0.8, 0.044, 0.044, 0.363, 0]], { per: 2, sides: 14, meridians: 2 });
  if (tier >= 2) {
    // Gauntlet: flared cuff up the forearm and a knuckle plate over the hand.
    side.push(...shell([[1.0, 0.052, 0.052, 0.343, 0], [0.96, 0.058, 0.058, 0.35, 0], [0.9, 0.056, 0.056, 0.354, 0], [0.865, 0.048, 0.048, 0.357, 0]], { per: 2, sides: 14, meridians: 2 }));
    side.push(...shell([[0.785, 0.05, 0.05, 0.364, 0.004], [0.745, 0.054, 0.056, 0.366, 0.006], [0.7, 0.048, 0.05, 0.367, 0.005]], { per: 2, arc: [Math.PI * 0.1, Math.PI * 0.9], sides: 8, meridians: 1 }));
  }
  if (tier >= 3) side.push(...gem(0.367, 0.62, 0.075, 0.026));
  if (tier >= 4) side.push(ring(0.367, 0.62, 0.075, 0.075, 0.075), vring(0.367, 0.62, 0.075, 0.075));
  return both(side);
}
function legs(tier: number): Line[] {
  // Boots: shaft up the calf plus a shaped toe.
  const boot: Line[] = [
    ...shell([[0.29, 0.058, 0.064, 0.095, 0], [0.22, 0.054, 0.06, 0.095, 0], [0.14, 0.048, 0.054, 0.095, 0], [0.08, 0.05, 0.062, 0.095, 0.01]], { per: 2, sides: 14, meridians: 2 }),
    ...shell([[0.08, 0.05, 0.062, 0.095, 0.01], [0.05, 0.047, 0.07, 0.095, 0.024], [0.03, 0.05, 0.092, 0.095, 0.048], [0.008, 0.044, 0.1, 0.095, 0.052]], { per: 2, sides: 14, meridians: 2 })
  ];
  if (tier >= 2) {
    boot.push(...shell([[0.57, 0.07, 0.078, 0.095, 0.012], [0.53, 0.076, 0.084, 0.095, 0.016], [0.48, 0.076, 0.084, 0.095, 0.016], [0.43, 0.068, 0.076, 0.095, 0.012]], { per: 2, arc: FRONT, sides: 10, meridians: 1 }));
    boot.push(...shell([[0.4, 0.066, 0.072, 0.095, 0.01], [0.36, 0.064, 0.07, 0.095, 0.01], [0.31, 0.058, 0.064, 0.095, 0.008]], { per: 2, arc: FRONT, sides: 10, meridians: 1 }));
  }
  const out = both(boot);
  if (tier >= 3) out.push(...shell([[1.085, 0.178, 0.108, 0, 0], [1.05, 0.178, 0.108, 0, 0], [1.015, 0.176, 0.106, 0, 0]], { per: 1, sides: 24, meridians: 2 }), ...gem(0, 1.05, 0.12, 0.022));
  if (tier >= 4) out.push(...both([...feather([0.15, 0.12, -0.02], [0.26, 0.22, -0.12], 0.02), ...feather([0.15, 0.09, -0.02], [0.27, 0.15, -0.13], 0.02), ...feather([0.15, 0.06, -0.02], [0.26, 0.08, -0.12], 0.018), ring(0.095, 0.01, 0.045, 0.11, 0.14)]));
  return out;
}
const PIECES: Record<GoalCategory, (tier: number) => Line[]> = { KNOWLEDGE: head, CAREER: shoulders, MINDFULNESS: chest, CREATIVITY: hands, HEALTH: legs };

/** Glowing equipment for one area at a tier (0 = none). Each tier adds to the previous one. */
export function equipmentFor(category: GoalCategory, tier: GearTier): Line[] {
  return tier <= 0 ? [] : PIECES[category](tier);
}
