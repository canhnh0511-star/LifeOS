import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { MetricDto } from '../api/types';
import { formatChange, formatValue, summarize } from '../domain/measurements';
import { dateText } from '../ui/format';
import { Sparkline } from './Sparkline';

interface Props {
  metric: MetricDto; today: string; busy: boolean;
  onRecord: (metric: MetricDto, date: string, value: number) => Promise<boolean>;
  onRemoveEntry: (metric: MetricDto, date: string) => void;
  onDelete: (metric: MetricDto) => void;
}

/** "12,5" and "12.5" both mean 12.5; anything else is not a number. */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function MetricCard({ metric, today, busy, onRecord, onRemoveEntry, onDelete }: Props) {
  const [date, setDate] = useState(today);
  useEffect(() => { setDate(today); }, [today]); // the app left open past midnight must not keep logging yesterday
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sum = summarize(metric);
  const recent = [...metric.entries].reverse().slice(0, 7);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseNumber(text);
    if (value === null || value <= 0) { setError('Nhập một số lớn hơn 0, ví dụ 72,5.'); return; }
    setError('');
    if (await onRecord(metric, date, value)) setText('');
  };
  return <article className="panel metric-card-body" aria-label={metric.name}>
    <div className="metric-head">
      <div><h3>{metric.name}</h3><span className="subtle-text">{sum.latest ? `Cập nhật ${dateText(sum.latest.date)}` : 'Chưa có số đo'}</span></div>
      <div className="metric-latest">{sum.latest ? <><strong>{formatValue(sum.latest.value)}</strong><small>{metric.unit}</small></> : <strong>—</strong>}</div>
    </div>
    {sum.latest && <div className="metric-trend">
      <Sparkline series={sum.series}/>
      <ul className="metric-deltas">
        {sum.change !== null && <li>So với lần trước <strong>{sum.change === 0 ? 'không đổi' : formatChange(sum.change, metric.unit)}</strong></li>}
        {sum.sinceStart !== null && <li>Từ {dateText(sum.series[0].date)} <strong>{sum.sinceStart === 0 ? 'không đổi' : formatChange(sum.sinceStart, metric.unit)}</strong></li>}
      </ul>
    </div>}
    <form className="metric-form" onSubmit={save} noValidate>
      <label>Ngày<input type="date" value={date} max={today} onChange={e => setDate(e.target.value || today)} aria-label={`Ngày đo ${metric.name}`}/></label>
      <label>Giá trị{metric.unit && ` (${metric.unit})`}<input inputMode="decimal" value={text} placeholder="0" onChange={e => setText(e.target.value)} aria-label={`Giá trị ${metric.name}`} aria-invalid={!!error}/></label>
      <button className="btn btn-primary" type="submit" disabled={busy}>Lưu số đo</button>
    </form>
    {error && <p className="metric-error" role="alert">{error}</p>}
    {recent.length > 0 && <details className="metric-history"><summary>Lịch sử gần đây</summary>
      <ul>{recent.map(entry => <li key={entry.date}><span>{dateText(entry.date)}</span><strong>{formatValue(entry.value)} {metric.unit}</strong>
        <button className="icon-btn" aria-label={`Xoá số đo ${metric.name} ngày ${entry.date}`} disabled={busy} onClick={() => onRemoveEntry(metric, entry.date)}><Trash2 size={15}/></button></li>)}</ul>
    </details>}
    {!metric.builtin && <div className="metric-delete">{confirmDelete
      ? <><span>Xoá chỉ số này và toàn bộ số đo?</span><button className="btn btn-danger" disabled={busy} onClick={() => onDelete(metric)}>Xoá hẳn</button><button className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>Giữ lại</button></>
      : <button className="btn btn-quiet" onClick={() => setConfirmDelete(true)}>Xoá chỉ số</button>}</div>}
  </article>;
}
