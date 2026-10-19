import { useState } from 'react';
import { Target } from 'lucide-react';
import type { BodyGoalDto, MetricDto } from '../api/types';
import { bmi, bmiClass, goalProgress, latestWeight, paceLabel, validateGoalInput } from '../domain/bodyGoal';
import { formatValue } from '../domain/measurements';
import { dateText } from '../ui/format';
import { parseNumber } from './MetricCard';
import { ProgressBar } from './primitives';

interface Props { goal: BodyGoalDto | null; metrics: MetricDto[]; today: string; busy: boolean; onSave: (goal: BodyGoalDto) => Promise<boolean>; }

const kg = (n: number) => `${formatValue(n)} kg`;

/**
 * The body goal: height, weight now, target weight and the number of days (100 by default), then day N of the goal, the way covered, the pace against a steady plan and BMI.
 * Tracking only: no XP and no change to the training plan. The weight comes from the weight measurements on this page.
 */
export function BodyGoalCard({ goal, metrics, today, busy, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  if (!goal || editing) return <GoalForm goal={goal} metrics={metrics} today={today} busy={busy} onCancel={goal ? () => setEditing(false) : undefined} onSave={async g => { const ok = await onSave(g); if (ok) setEditing(false); return ok; }}/>;
  const p = goalProgress(goal, metrics, today);
  return <section className="panel body-goal" aria-label="Mục tiêu cơ thể">
    <div className="body-goal-head"><h2><Target size={18} aria-hidden="true"/> Mục tiêu {goal.days} ngày</h2>
      <span className="diff-chip">{p.finished ? 'Đã hết thời gian' : p.day === 0 ? `Bắt đầu ${dateText(goal.startDate)}` : `Ngày ${p.day}/${goal.days}`}</span></div>
    <p className="body-goal-sub">{kg(goal.startWeightKg)} → <strong>{kg(goal.targetWeightKg)}</strong>{p.day > 0 && !p.finished ? ` · còn ${p.daysLeft} ngày` : ''}</p>
    <ProgressBar value={Math.round(p.fraction * 100)} variant="green" size="slim"/>
    <dl className="body-goal-stats">
      <div><dt>Hiện tại</dt><dd>{p.currentKg === null ? 'Chưa có' : kg(p.currentKg)}</dd></div>
      <div><dt>Đã thay đổi</dt><dd>{p.changedKg === null ? '—' : `${p.changedKg > 0 ? '+' : ''}${formatValue(p.changedKg)} kg`}</dd></div>
      <div><dt>Còn lại</dt><dd>{p.toGoKg === null ? '—' : kg(p.toGoKg)}</dd></div>
      <div><dt>Theo kế hoạch hôm nay</dt><dd>{kg(p.expectedKg)}</dd></div>
    </dl>
    <p className={`body-goal-pace is-${p.pace.toLowerCase().replace('_', '-')}`} role="status">{paceLabel[p.pace]}{p.weeklyKg !== null ? ` · ${p.weeklyKg > 0 ? '+' : ''}${formatValue(p.weeklyKg)} kg/tuần` : ''}</p>
    {p.pace === 'NO_DATA' && <p className="form-note">Ghi cân nặng ở thẻ "Cân nặng" bên dưới để thấy tiến độ.</p>}
    <p className="body-goal-bmi">BMI {p.bmiNow === null ? formatValue(p.bmiStart) : formatValue(p.bmiNow)} ({bmiClass(p.bmiNow ?? p.bmiStart)}) → mục tiêu {formatValue(p.bmiTarget)} ({bmiClass(p.bmiTarget)}). Chiều cao {goal.heightCm} cm.</p>
    {p.warnings.map(w => <p key={w} role="alert" className="body-goal-warn">{w}</p>)}
    <p className="form-note">Chỉ để theo dõi: không cộng XP. Mức giảm bền vững thường là 0,5–1% cân nặng mỗi tuần; đây không phải tư vấn y tế.</p>
    <button type="button" className="btn btn-quiet" onClick={() => setEditing(true)}>Chỉnh sửa mục tiêu</button>
  </section>;
}

function GoalForm({ goal, metrics, today, busy, onCancel, onSave }: { goal: BodyGoalDto | null; metrics: MetricDto[]; today: string; busy: boolean; onCancel?: () => void; onSave: (g: BodyGoalDto) => Promise<boolean> }) {
  const current = latestWeight(metrics, today)?.value;
  const [height, setHeight] = useState(goal ? String(goal.heightCm) : '');
  const [start, setStart] = useState(goal ? String(goal.startWeightKg).replace('.', ',') : current !== undefined ? String(current).replace('.', ',') : '');
  const [target, setTarget] = useState(goal ? String(goal.targetWeightKg).replace('.', ',') : '');
  const [days, setDays] = useState(goal ? String(goal.days) : '100');
  const [restart, setRestart] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const input = { heightCm: parseNumber(height) ?? NaN, startWeightKg: parseNumber(start) ?? NaN, targetWeightKg: parseNumber(target) ?? NaN, days: parseNumber(days) ?? NaN };
  const ready = [input.heightCm, input.startWeightKg, input.targetWeightKg].every(Number.isFinite);
  const targetBmi = ready && Object.keys(validateGoalInput(input)).length === 0 ? bmi(input.targetWeightKg, input.heightCm) : null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateGoalInput(input);
    setErrors(found);
    if (Object.keys(found).length) return;
    await onSave({ ...input, startDate: goal && !restart ? goal.startDate : today });
  };
  const field = (id: string, label: string, value: string, set: (v: string) => void, mode: 'numeric' | 'decimal', hint?: string) =>
    <label>{label}<input inputMode={mode} value={value} aria-label={label} aria-invalid={!!errors[id]} onChange={e => set(e.target.value)} placeholder={hint}/>{errors[id] && <span role="alert" className="set-error">{errors[id]}</span>}</label>;
  return <form className="panel body-goal body-goal-form" aria-label={goal ? 'Chỉnh sửa mục tiêu cơ thể' : 'Đặt mục tiêu cơ thể'} onSubmit={submit} noValidate>
    <h2><Target size={18} aria-hidden="true"/> {goal ? 'Chỉnh sửa mục tiêu' : 'Đặt mục tiêu 100 ngày'}</h2>
    {!goal && <p className="form-note">Nhập chiều cao, cân nặng hiện tại và cân nặng bạn muốn đạt. App so tiến độ của bạn với một nhịp đều mỗi ngày.</p>}
    <div className="body-goal-fields">
      {field('heightCm', 'Chiều cao (cm)', height, setHeight, 'numeric', '166')}
      {field('startWeightKg', 'Cân nặng hiện tại (kg)', start, setStart, 'decimal', '86')}
      {field('targetWeightKg', 'Cân nặng mục tiêu (kg)', target, setTarget, 'decimal', '78,5')}
      {field('days', 'Số ngày', days, setDays, 'numeric', '100')}
    </div>
    {targetBmi !== null && <p className="form-note" role="status">BMI mục tiêu {formatValue(targetBmi)} ({bmiClass(targetBmi)}).{targetBmi < 18.5 ? ' Thấp hơn mức khỏe mạnh, hãy chọn cân nặng cao hơn.' : ''}</p>}
    {goal && <label className="plan-replace"><input type="checkbox" checked={restart} onChange={e => setRestart(e.target.checked)}/> <span>Bắt đầu đếm lại từ hôm nay</span></label>}
    <div className="sheet-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{goal ? 'Lưu mục tiêu' : 'Đặt mục tiêu'}</button>{onCancel && <button type="button" className="btn btn-quiet" onClick={onCancel}>Huỷ</button>}</div>
  </form>;
}
