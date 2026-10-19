import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BodyGoalDto, MetricDto } from '../api/types';
import { BodyGoalCard } from '../components/BodyGoalCard';
import { MetricCard } from '../components/MetricCard';

interface Props {
  metrics: MetricDto[]; failed?: boolean; onRetry?: () => void; today: string; busy: boolean;
  onRecord: (metric: MetricDto, date: string, value: number) => Promise<boolean>;
  onRemoveEntry: (metric: MetricDto, date: string) => void;
  onCreate: (name: string, unit: string) => Promise<boolean>;
  onDelete: (metric: MetricDto) => void;
  /** the body goal; null when none is set yet, undefined while it loads */ goal?: BodyGoalDto | null; onSaveGoal?: (goal: BodyGoalDto) => Promise<boolean>;
}

/** Body numbers over time (weight, waist, body fat, your own). They are for tracking only: no XP, no streak, no chests. */
export function BodyPage({ metrics, failed, onRetry, today, busy, onRecord, onRemoveEntry, onCreate, onDelete, goal, onSaveGoal }: Props) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [adding, setAdding] = useState(false);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onCreate(name.trim(), unit.trim())) { setName(''); setUnit(''); setAdding(false); }
  };
  return <>
    <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> SỐ ĐO CƠ THỂ</div><h1>Theo dõi <span className="text-gradient">cơ thể.</span></h1><p>Ghi lại cân nặng, vòng eo... để thấy tiến bộ thật. Số đo không cộng XP, chỉ để bạn theo dõi.</p></div>
      <button className="btn btn-outlined" onClick={() => setAdding(a => !a)} aria-expanded={adding}><Plus size={17}/> Thêm chỉ số</button></div>
    {adding && <form className="panel metric-new" onSubmit={create}>
      <label>Tên chỉ số<input value={name} maxLength={40} placeholder="Ví dụ: Vòng bắp tay" onChange={e => setName(e.target.value)} aria-label="Tên chỉ số mới"/></label>
      <label>Đơn vị<input value={unit} maxLength={12} placeholder="cm" onChange={e => setUnit(e.target.value)} aria-label="Đơn vị chỉ số mới"/></label>
      <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>Thêm</button>
    </form>}
    {failed && metrics.length === 0 && <div className="panel" role="alert"><p>Không tải được số đo.</p>{onRetry && <button className="btn btn-secondary" onClick={onRetry}>Thử lại</button>}</div>}
    {goal !== undefined && onSaveGoal && <BodyGoalCard goal={goal} metrics={metrics} today={today} busy={busy} onSave={onSaveGoal}/>}
    <div className="metric-grid-page">{metrics.map(m => <MetricCard key={m.id} metric={m} today={today} busy={busy} onRecord={onRecord} onRemoveEntry={onRemoveEntry} onDelete={onDelete}/>)}</div>
  </>;
}
