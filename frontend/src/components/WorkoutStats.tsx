import { useEffect, useMemo, useState } from 'react';
import type { WorkoutStatsDto } from '../api/types';
import { muscleLabel, viName } from '../domain/exerciseLibrary';
import { summarizeStats } from '../domain/workoutStats';
import { number } from '../ui/format';
import { CardTitle } from './primitives';

interface Props { period: '7d' | '30d'; loadStats: (days: number) => Promise<WorkoutStatsDto>; }
const SLICES = ['var(--accent)', 'color-mix(in srgb,var(--accent) 70%,#0d1b2a)', 'color-mix(in srgb,var(--accent) 45%,#0d1b2a)', '#6f7fa8', '#8a6fa8', '#5f8aa8'];

/** Gym stats from the set log (B-41): sessions, sets, volume, sets per day and the share of each muscle group. */
export function WorkoutStats({ period, loadStats }: Props) {
  const [stats, setStats] = useState<WorkoutStatsDto | null>(null);
  const [failed, setFailed] = useState(false);
  const length = period === '7d' ? 7 : 30;
  useEffect(() => {
    let alive = true; setStats(null); setFailed(false);
    loadStats(length).then(r => { if (alive) setStats(r); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [length, loadStats]);
  const sum = useMemo(() => stats ? summarizeStats(stats) : null, [stats]);
  const cap = Math.max(1, ...(sum?.perDay.map(d => d.sets) ?? [1]));
  let acc = 0;
  return <article className="panel workout-stats" aria-label="Thống kê tập luyện">
    <CardTitle title="Tập luyện" kicker={`Từ nhật ký set · ${length} ngày gần nhất`}/>
    {failed ? <p role="alert" className="set-error">Không tải được thống kê tập luyện.</p>
      : !sum ? <p className="form-note" role="status">Đang tải…</p>
      : sum.totalSets === 0 ? <p className="form-note">Chưa có set nào được ghi trong {length} ngày này. Mở "Tập từng set" trong một buổi tập để bắt đầu.</p>
      : <>
        <div className="ws-tiles"><div><small>Buổi tập</small><strong>{sum.sessions}</strong></div><div><small>Tổng set</small><strong>{sum.totalSets}</strong></div><div><small>Tổng rep</small><strong>{number(sum.totalReps)}</strong></div><div><small>Khối lượng</small><strong>{number(Math.round(sum.volumeKg))} kg</strong></div></div>
        <div className="activity-chart" aria-label="Số set mỗi ngày">{sum.perDay.map(d => <div className="activity-col" key={d.date} title={`${d.date}: ${d.sets} set`}>
          <div className="activity-bar-space"><div className="activity-bar-done" style={{ height: `${d.sets / cap * 100}%` }}/></div><span>{d.date.slice(length === 7 ? 5 : 8)}</span></div>)}</div>
        <div className="ws-groups">
          <svg viewBox="0 0 42 42" width="120" height="120" role="img" aria-label="Tỉ lệ set theo nhóm cơ"><circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line)" strokeWidth="6"/>
            {sum.byGroup.map((g, i) => { const dash = g.share * 100, off = 25 - acc; acc += dash; return <circle key={g.group} cx="21" cy="21" r="15.9" fill="none" stroke={SLICES[i % SLICES.length]} strokeWidth="6" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={off}/>; })}</svg>
          <ul>{sum.byGroup.map((g, i) => <li key={g.group}><i style={{ background: SLICES[i % SLICES.length] }}/>{muscleLabel[g.group]} <b>{Math.round(g.share * 100)}%</b> <small>{g.sets} set</small></li>)}</ul>
        </div>
        <h3 className="sheet-h">Bài nặng nhất</h3>
        <ol className="ws-top">{sum.topExercises.map(e => <li key={e.name}><span>{viName(e.name)}</span><small>{e.sets} set{e.volumeKg ? ` · ${number(Math.round(e.volumeKg))} kg` : ''}</small></li>)}</ol>
      </>}
  </article>;
}
