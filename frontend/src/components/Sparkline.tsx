import type { MetricEntryDto } from '../api/types';

/** Small trend line for a metric. Needs two points to draw a line; one point is a dot. Decorative: the numbers beside it carry the meaning. */
export function Sparkline({ series, width = 220, height = 56 }: { series: MetricEntryDto[]; width?: number; height?: number }) {
  if (series.length === 0) return null;
  const values = series.map(s => s.value);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pad = 5;
  const x = (i: number) => series.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (series.length - 1);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - 2 * pad);
  const points = series.map((s, i) => `${x(i).toFixed(1)},${y(s.value).toFixed(1)}`).join(' ');
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width="100%" height={height} aria-hidden="true" preserveAspectRatio="none">
    {series.length > 1 && <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>}
    <circle cx={x(series.length - 1)} cy={y(values[values.length - 1])} r="3.5" fill="currentColor"/>
  </svg>;
}
