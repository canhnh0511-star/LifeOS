import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { CreateGoalRequest, CreateHabitRequest, GoalCategory, GoalDto, HabitDto, PatchHabit, Weekday } from '../api/types';
import { categoryLabel, todayInTimezone } from '../domain/rules';
import { categoryIcons } from '../ui/categories';

const weekdays: { day: Weekday; short: string }[] = [
  { day: 1, short: 'T2' }, { day: 2, short: 'T3' }, { day: 3, short: 'T4' },
  { day: 4, short: 'T5' }, { day: 5, short: 'T6' }, { day: 6, short: 'T7' }, { day: 7, short: 'CN' }
];

export function GoalForm({ onClose, onSave }: { onClose: () => void; onSave: (v: CreateGoalRequest) => Promise<void> }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('CAREER'); const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!title.trim()) return; setSaving(true); try { await onSave({ title: title.trim(), description: description.trim(), category }); } finally { setSaving(false); } };
  return <form onSubmit={submit} className="form-stack">
    <label>Tên mục tiêu <input value={title} onChange={e => setTitle(e.target.value)} autoFocus maxLength={150} required placeholder="Ví dụ: Become a better engineer" /></label>
    <label>Lĩnh vực <select value={category} onChange={e => setCategory(e.target.value as GoalCategory)}>{(Object.keys(categoryIcons) as GoalCategory[]).map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select></label>
    <label>Mô tả <textarea rows={3} value={description} maxLength={600} onChange={e => setDescription(e.target.value)} placeholder="Mình muốn đạt được điều gì?" /></label>
    <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={saving || !title.trim()}><Plus size={16}/>{saving ? 'Đang lưu...' : 'Tạo mục tiêu'}</button></div>
  </form>;
}
export function HabitForm({ goals, onClose, onSave }: { goals: GoalDto[]; onClose: () => void; onSave: (v: CreateHabitRequest) => Promise<void> }) {
  const [goalId, setGoalId] = useState(goals.find(g => g.status === 'ACTIVE')?.id || '');
  const [title, setTitle] = useState(''); const [targetMinutes, setMinutes] = useState(30);
  const [xpReward, setReward] = useState(35); const [days, setDays] = useState<Weekday[]>([1,2,3,4,5,6,7]);
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!title.trim() || !days.length) return; setSaving(true); try { await onSave({ goalId, title: title.trim(), targetMinutes, xpReward, weekdays: days, startDate: todayInTimezone() }); } finally { setSaving(false); } };
  return <form onSubmit={submit} className="form-stack">
    <label>Thói quen <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="Ví dụ: Luyện piano 30 phút" maxLength={150}/></label>
    <label>Thuộc mục tiêu <select value={goalId} onChange={e => setGoalId(e.target.value)} required>{goals.filter(g => g.status === 'ACTIVE').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
    <div className="form-columns"><label>Thời lượng (phút) <input type="number" min="1" max="480" value={targetMinutes} onChange={e => setMinutes(Number(e.target.value))} required /></label><label>XP thưởng <select value={xpReward} onChange={e => setReward(Number(e.target.value))}><option value="20">20 XP · Dễ</option><option value="35">35 XP · Vừa</option><option value="40">40 XP · Vừa+</option><option value="50">50 XP · Khó</option></select></label></div>
    <fieldset className="weekday-field"><legend>Lịch lặp hằng tuần</legend><div className="weekday-choice">{weekdays.map(d => <button type="button" key={d.day} className={days.includes(d.day) ? 'selected' : ''} aria-pressed={days.includes(d.day)} onClick={() => setDays(v => v.includes(d.day) ? v.filter(x => x !== d.day) : [...v, d.day].sort())}>{d.short}</button>)}</div></fieldset>
    <p className="form-note">Lịch bắt đầu từ hôm nay. Thay đổi lịch trong quá khứ chưa được hỗ trợ ở MVP.</p>
    <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={saving || !title.trim() || !goalId || !days.length || !(targetMinutes > 0)}><Plus size={16}/>{saving ? 'Đang lưu...' : 'Tạo thói quen'}</button></div>
  </form>;
}

/** Edits one habit. Only changed fields are sent. Schedule changes apply from tomorrow; archiving is final and asks once. */
export function EditHabitForm({ habit, onClose, onSave }: { habit: HabitDto; onClose: () => void; onSave: (patch: PatchHabit) => Promise<void> }) {
  const [title, setTitle] = useState(habit.title); const [targetMinutes, setMinutes] = useState(habit.targetMinutes);
  const [xpReward, setReward] = useState(habit.xpReward); const [days, setDays] = useState<Weekday[]>([...habit.weekdays].sort());
  const [endDate, setEndDate] = useState(habit.endDate ?? ''); const [confirmArchive, setConfirm] = useState(false); const [saving, setSaving] = useState(false);
  const patch: PatchHabit = {};
  if (title.trim() !== habit.title) patch.title = title.trim();
  if (targetMinutes !== habit.targetMinutes) patch.targetMinutes = targetMinutes;
  if (xpReward !== habit.xpReward) patch.xpReward = xpReward;
  if (days.join() !== [...habit.weekdays].sort().join()) patch.weekdays = days;
  if ((endDate || null) !== habit.endDate) patch.endDate = endDate || null;
  const ended = !!habit.endDate && habit.endDate < todayInTimezone(); // an ended habit's end date can no longer change
  const valid = !!title.trim() && days.length > 0 && Number.isInteger(targetMinutes) && targetMinutes >= 1 && targetMinutes <= 480 && Number.isInteger(xpReward) && xpReward >= 0 && xpReward <= 100;
  const send = async (body: PatchHabit) => { setSaving(true); try { await onSave(body); } finally { setSaving(false); } };
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!valid) return; if (!Object.keys(patch).length) { onClose(); return; } await send(patch); };
  return <form onSubmit={submit} className="form-stack">
    <label>Thói quen <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus maxLength={150}/></label>
    <div className="form-columns"><label>Thời lượng (phút) <input type="number" min="1" max="480" value={targetMinutes} onChange={e => setMinutes(Number(e.target.value))} required /></label><label>XP thưởng (0–100) <input type="number" min="0" max="100" value={xpReward} onChange={e => setReward(Number(e.target.value))} required /></label></div>
    <fieldset className="weekday-field"><legend>Lịch lặp hằng tuần</legend><div className="weekday-choice">{weekdays.map(d => <button type="button" key={d.day} className={days.includes(d.day) ? 'selected' : ''} aria-pressed={days.includes(d.day)} onClick={() => setDays(v => v.includes(d.day) ? v.filter(x => x !== d.day) : [...v, d.day].sort())}>{d.short}</button>)}</div></fieldset>
    <label>Ngày kết thúc (không bắt buộc) <input type="date" value={endDate} min={ended ? undefined : todayInTimezone()} disabled={ended} onChange={e => setEndDate(e.target.value)}/></label>
    <p className="form-note">Lịch mới có hiệu lực từ ngày mai. Những ngày đã qua và hôm nay không đổi. XP mới chỉ áp dụng từ ngày mai.</p>
    {confirmArchive
      ? <div className="form-note" role="alert">Lưu trữ “{habit.title}”? Thói quen biến khỏi Today từ ngày mai, lịch sử và XP vẫn được giữ, và không thể kích hoạt lại.{Object.keys(patch).length > 0 && ' Các chỉnh sửa chưa lưu sẽ không được áp dụng.'} <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={() => setConfirm(false)}>Giữ lại</button><button type="button" className="btn btn-danger-quiet" disabled={saving} onClick={() => send({ status: 'ARCHIVED' })}>Xác nhận lưu trữ</button></div></div>
      : <div className="form-actions"><button type="button" className="btn btn-danger-quiet" onClick={() => setConfirm(true)}>Lưu trữ thói quen</button><button type="button" className="btn btn-quiet" onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={saving || !valid}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>}
  </form>;
}
