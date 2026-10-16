import type { MetricDto, MetricEntryDto } from '../api/types';

export interface MetricSummary { latest: MetricEntryDto | null; previous: MetricEntryDto | null; /** Latest minus the entry before it; null with fewer than two entries. */ change: number | null; /** Latest minus the first entry in the window. */ sinceStart: number | null; }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Entries arrive oldest first; `window` keeps the most recent ones for the chart. */
export function summarize(metric: MetricDto, window = 30): MetricSummary & { series: MetricEntryDto[] } {
  const series = metric.entries.slice(-window);
  const latest = series.at(-1) ?? null;
  const previous = series.length > 1 ? series[series.length - 2] : null;
  return { latest, previous, change: latest && previous ? round2(latest.value - previous.value) : null, sinceStart: latest && series.length > 1 ? round2(latest.value - series[0].value) : null, series };
}

/** "+0,5" / "-1,2" / "0" with the unit, locale style (comma). */
export function formatChange(delta: number, unit: string): string {
  const text = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(delta);
  return unit ? `${text} ${unit}` : text;
}
export const formatValue = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
