/** A small line over `points`, ending in a dot. A single point is drawn as a flat line. */
export function LiftSparkline({ points, label, width = 84, height = 30 }: { points: readonly number[]; label: string; width?: number; height?: number }) {
  const pad = 4, min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const xy = points.map((v, i) => [pad + (points.length > 1 ? i / (points.length - 1) : 1) * (width - 2 * pad), height - pad - (max === min ? 0.5 : (v - min) / span) * (height - 2 * pad)] as const);
  const path = (xy.length > 1 ? xy : [[pad, xy[0][1]], xy[0]] as const).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  return <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <polyline points={path} fill="none" stroke="var(--sys-cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={lx} cy={ly} r="3.4" fill="#c6fa55"/>
  </svg>;
}
