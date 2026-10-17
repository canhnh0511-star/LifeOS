import type { MuscleGroup } from '../domain/exerciseLibrary';

/** A simple wireframe body (front view) with the trained muscle groups lit. Decorative: the groups are also named in text. */
const ZONES: Record<MuscleGroup, { x: number; y: number; w: number; h: number; r: number }[]> = {
  SHOULDERS: [{ x: 22, y: 34, w: 14, h: 12, r: 6 }, { x: 64, y: 34, w: 14, h: 12, r: 6 }],
  CHEST: [{ x: 36, y: 38, w: 28, h: 16, r: 6 }],
  ARMS: [{ x: 14, y: 48, w: 9, h: 28, r: 4 }, { x: 77, y: 48, w: 9, h: 28, r: 4 }],
  CORE: [{ x: 38, y: 56, w: 24, h: 26, r: 5 }],
  BACK: [{ x: 36, y: 38, w: 28, h: 8, r: 3 }, { x: 40, y: 46, w: 20, h: 8, r: 3 }],
  LEGS: [{ x: 33, y: 86, w: 15, h: 52, r: 7 }, { x: 52, y: 86, w: 15, h: 52, r: 7 }]
};
export function MuscleFigure({ primary, secondary = [], size = 96 }: { primary: MuscleGroup; secondary?: MuscleGroup[]; size?: number }) {
  const lit = (g: MuscleGroup) => g === primary ? 'is-primary' : secondary.includes(g) ? 'is-secondary' : '';
  return <svg className="muscle-figure" width={size} height={size * 1.5} viewBox="0 0 100 150" aria-hidden="true" focusable="false">
    <circle cx="50" cy="16" r="10" className="mf-body"/>
    <rect x="34" y="30" width="32" height="54" rx="10" className="mf-body"/>
    <rect x="13" y="34" width="11" height="44" rx="5" className="mf-body"/><rect x="76" y="34" width="11" height="44" rx="5" className="mf-body"/>
    <rect x="34" y="84" width="14" height="56" rx="7" className="mf-body"/><rect x="52" y="84" width="14" height="56" rx="7" className="mf-body"/>
    {(Object.keys(ZONES) as MuscleGroup[]).map(g => ZONES[g].map((z, n) => <rect key={`${g}${n}`} x={z.x} y={z.y} width={z.w} height={z.h} rx={z.r} className={`mf-zone ${lit(g)}`}/>))}
  </svg>;
}
