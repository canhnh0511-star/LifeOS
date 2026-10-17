import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { HabitDto } from '../api/types';
import { muscleLabel, viName, type MuscleGroup } from '../domain/exerciseLibrary';
import { bossProgress } from '../domain/hunterStats';
import { plannedWeek, maxWeightTrends, setsByGroup } from '../domain/weekProgress';
import { WEEKDAY_SHORT, weekDates, weekStart } from '../domain/week';
import type { DaySets } from '../domain/workoutStats';
import { LiftSparkline } from '../components/LiftSparkline';
import { SysPanel } from '../components/SysPanel';
import { number } from '../ui/format';

const GROUP_ORDER: MuscleGroup[] = ['LEGS', 'CHEST', 'BACK', 'SHOULDERS', 'CORE', 'ARMS'];

/** Progress tab: this week's sessions and boss gate, heaviest weight per exercise, and sets per muscle group. All from the set log; nothing here gives XP. */
export function InsightsPage({ habits, today, loadHistory }: { habits: readonly HabitDto[]; today: string; loadHistory: () => Promise<DaySets[]> }) {
  const [days, setDays] = useState<DaySets[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true; setDays(null); setFailed(false);
    loadHistory().then(r => { if (alive) setDays(r); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [loadHistory]);
  const ws = weekStart(today), week = weekDates(today);
  const plan = useMemo(() => plannedWeek(habits, ws), [habits, ws]);
  const boss = useMemo(() => days ? bossProgress(days, ws, plan.sessions) : null, [days, ws, plan]);
  const trends = useMemo(() => days ? maxWeightTrends(days, 5, 3) : [], [days]);
  const done = useMemo(() => days ? setsByGroup(days, ws) : new Map<MuscleGroup, number>(), [days, ws]);
  const trained = new Set((days ?? []).filter(d => d.sets.length > 0).map(d => d.date));
  const groups = GROUP_ORDER.filter(g => (plan.sets.get(g) ?? 0) > 0 || (done.get(g) ?? 0) > 0);
  const left = boss ? Math.max(0, boss.planned - boss.done) : 0;

  return <div className="progress-page">
    <header className="sys-head"><span className="sys-eyebrow">TIẾN ĐỘ</span><h1>Bạn đang mạnh lên</h1></header>
    {failed ? <p role="alert" className="set-error">Không tải được lịch sử tập.</p>
      : !days || !boss ? <p className="form-note" role="status">Đang tải…</p>
      : trained.size === 0 && !days.some(d => d.sets.length) ? <p className="form-note">Chưa có buổi tập nào trong 5 tuần qua. Hoàn thành một buổi và ghi set để thấy tiến độ ở đây.</p>
      : <>
        <SysPanel label={`TUẦN NÀY · ${boss.done}/${boss.planned} BUỔI`} tone="red" className="prog-week">
          <ol className="prog-days" aria-label="Các ngày trong tuần">{week.map((d, i) => {
            const isDone = trained.has(d), isToday = d === today, name = WEEKDAY_SHORT[i];
            return <li key={d} className={isToday ? 'is-today' : ''}><span className={`prog-dot ${isDone ? 'is-done' : ''}`} aria-label={`${name} ${isToday ? 'hôm nay' : isDone ? 'đã tập' : 'chưa tập'}`}>{isDone && <Check size={14} aria-hidden="true"/>}</span><span>{name}</span></li>;
          })}</ol>
          <div className="prog-boss"><img src="/bosses/slime-of-inertia.jpg" alt="Boss tuần: Slime Quán tính" width="40" height="40"/>
            <div><p><strong>Cổng tuần: Slime Quán tính</strong><span>{boss.planned === 0 ? 'Chưa có buổi trong kế hoạch' : boss.defeated ? 'Đã hạ boss' : `Còn ${left} buổi`}</span></p>
              <div className="prog-bar" role="progressbar" aria-label="Máu boss tuần" aria-valuemin={0} aria-valuemax={boss.planned || 1} aria-valuenow={boss.done}><i style={{ width: `${boss.planned ? Math.min(100, boss.done / boss.planned * 100) : 0}%` }}/></div></div></div>
        </SysPanel>
        {trends.length > 0 && <SysPanel label="TẠ NẶNG NHẤT THEO BÀI · 5 BUỔI GẦN NHẤT" tone="cyan">
          <ul className="prog-lifts">{trends.map(t => <li key={t.exercise}>
            <div><strong>{viName(t.exercise)}</strong>{t.delta > 0 && <span className="prog-gain">+{number(t.delta)} kg</span>}</div>
            <LiftSparkline points={t.points} label={`Tạ nặng nhất ${viName(t.exercise)}: ${t.points.map(number).join(', ')} kg`}/>
            <b>{number(t.latest)}<small> kg</small></b></li>)}</ul>
        </SysPanel>}
        {groups.length > 0 && <SysPanel label="NHÓM CƠ TUẦN NÀY · SET ĐÃ TẬP" tone="cyan">
          <ul className="prog-groups" aria-label="Set theo nhóm cơ">{groups.map(g => { const p = plan.sets.get(g) ?? 0, n = done.get(g) ?? 0; return <li key={g} className={p > 0 && n === 0 ? 'is-empty' : ''}>
            <span>{muscleLabel[g]}</span><div className="prog-bar"><i style={{ width: `${p ? Math.min(100, n / p * 100) : 100}%` }}/></div><b>{p ? `${n}/${p}` : n}</b></li>; })}</ul>
        </SysPanel>}
      </>}
  </div>;
}
