export interface RadarStat { key: string; label: string; /** short label drawn on the chart */ short: string; value: number | null; }
const RINGS = [25, 50, 75, 100];
const pt = (i: number, n: number, r: number, cx: number, cy: number) => { const a = (-90 + 360 / n * i) * Math.PI / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; };

/** Radar of the five gym stats (0-100). A null stat has no data yet: it sits at the centre with no dot, never as a score. */
export function StatRadar({ stats, size = 190 }: { stats: readonly RadarStat[]; size?: number }) {
  const c = size / 2, r = size / 2 - 40, n = stats.length;
  const poly = (vals: readonly number[]) => vals.map((v, i) => { const p = pt(i, n, r * v / 100, c, c); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
  const label = stats.map(s => `${s.label} ${s.value ?? 'chưa đủ dữ liệu'}`).join(', ');
  return <svg className="stat-radar" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Radar chỉ số: ${label}`}>
    {RINGS.map(v => <polygon key={v} points={poly(stats.map(() => v))} fill="none" stroke="rgba(92,200,255,.18)"/>)}
    {stats.map((s, i) => { const e = pt(i, n, r, c, c); return <line key={s.key} x1={c} y1={c} x2={e.x} y2={e.y} stroke="rgba(92,200,255,.18)"/>; })}
    <polygon points={poly(stats.map(s => s.value ?? 0))} fill="rgba(92,200,255,.28)" stroke="var(--sys-cyan)" strokeWidth="1.5"/>
    {stats.map((s, i) => { if (s.value === null) return null; const p = pt(i, n, r * s.value / 100, c, c); return <circle key={s.key} cx={p.x} cy={p.y} r="3" fill="#c6fa55"/>; })}
    {stats.map((s, i) => { const p = pt(i, n, r + 20, c, c); return <text key={s.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fontWeight="600" fill="#c9d5e6">{s.short}</text>; })}
  </svg>;
}
