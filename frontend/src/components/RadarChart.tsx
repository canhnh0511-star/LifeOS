import { useId } from 'react';
import type { RadarAxis } from '../domain/insights';
import { categoryLabel } from '../domain/rules';

const RINGS = [25, 50, 75, 100];

function point(index: number, count: number, radius: number, cx: number, cy: number) {
  const angle = (-90 + (360 / count) * index) * Math.PI / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}
const polygon = (values: (number | null)[], radius: number, cx: number, cy: number) =>
  values.map((v, i) => { const p = point(i, values.length, radius * (v ?? 0) / 100, cx, cy); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');

/** Radar of completion rate per life area. A null value means "no data" and is drawn as an empty marker, never as 0%. */
export function RadarChart({ axes, compact = false }: { axes: RadarAxis[]; compact?: boolean }) {
  const titleId = useId();
  const width = compact ? 280 : 400, height = compact ? 250 : 340;
  const cx = width / 2, cy = height / 2 + (compact ? 4 : 6), radius = compact ? 78 : 112;
  const hasPrevious = axes.some(a => a.previous !== null);
  const current = axes.map(a => a.value);
  return <figure className={`radar ${compact ? 'compact' : ''}`}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId}>
      <title id={titleId}>Radar tỷ lệ hoàn thành theo lĩnh vực</title>
      {RINGS.map(r => <polygon key={r} className="radar-ring" points={polygon(axes.map(() => r), radius, cx, cy)} />)}
      {axes.map((a, i) => { const end = point(i, axes.length, radius, cx, cy); return <line key={a.category} className="radar-axis" x1={cx} y1={cy} x2={end.x} y2={end.y} />; })}
      {hasPrevious && <polygon className="radar-previous" points={polygon(axes.map(a => a.previous), radius, cx, cy)} />}
      <polygon className="radar-area" points={polygon(current, radius, cx, cy)} />
      {axes.map((a, i) => {
        const dot = point(i, axes.length, radius * (a.value ?? 0) / 100, cx, cy);
        const label = point(i, axes.length, radius + (compact ? 20 : 26), cx, cy);
        const anchor = Math.abs(label.x - cx) < 6 ? 'middle' : label.x > cx ? 'start' : 'end';
        return <g key={a.category}>
          <circle className={a.value === null ? 'radar-dot empty' : 'radar-dot'} cx={dot.x} cy={dot.y} r={a.value === null ? 3.5 : 4} />
          <text className="radar-label" x={label.x} y={label.y} textAnchor={anchor} dominantBaseline="middle">
            <tspan x={label.x} dy={compact ? '-0.2em' : '-0.45em'}>{categoryLabel(a.category)}</tspan>
            <tspan className="radar-value" x={label.x} dy="1.25em">{a.value === null ? 'Chưa có dữ liệu' : `${a.value}%`}</tspan>
          </text>
        </g>;
      })}
    </svg>
    {!compact && hasPrevious && <figcaption className="radar-legend"><span><i className="legend-done" />Kỳ này</span><span><i className="legend-previous" />Kỳ trước</span></figcaption>}
    <table className="sr-only">
      <caption>Tỷ lệ hoàn thành theo lĩnh vực</caption>
      <thead><tr><th>Lĩnh vực</th><th>Kỳ này</th><th>Kỳ trước</th></tr></thead>
      <tbody>{axes.map(a => <tr key={a.category}><td>{categoryLabel(a.category)}</td><td>{a.value === null ? 'Chưa có dữ liệu' : `${a.value}% (${a.completed}/${a.scheduled})`}</td><td>{a.previous === null ? 'Chưa có dữ liệu' : `${a.previous}%`}</td></tr>)}</tbody>
    </table>
  </figure>;
}
