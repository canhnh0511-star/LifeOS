import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import type { ImportHabitPlanRequest } from '../api/types';
import { PROGRAMS, muscleLabel, planRequest, prescribed } from '../domain/exerciseLibrary';
import { todayInTimezone } from '../domain/rules';

const DAY_NAMES: Record<number, string> = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };

/** Pick a ready-made weekly gym program, see exactly what it will create, and only then import it (nothing is sent before the confirm). */
export function PlanImportForm({ onClose, onImport }: { onClose: () => void; onImport: (request: ImportHabitPlanRequest) => Promise<void> }) {
  const [programId, setProgramId] = useState(PROGRAMS[0].id);
  const [startDate, setStartDate] = useState(todayInTimezone());
  const [saving, setSaving] = useState(false);
  const program = PROGRAMS.find(p => p.id === programId)!;
  const submit = async () => { if (saving || !startDate) return; setSaving(true); try { await onImport(planRequest(program, startDate)); } finally { setSaving(false); } };
  return <div className="form-stack plan-import">
    <fieldset className="plan-choices"><legend>Chọn giáo án</legend>
      {PROGRAMS.map(p => <label key={p.id} className={`plan-choice ${p.id === programId ? 'is-selected' : ''}`}>
        <input type="radio" name="program" value={p.id} checked={p.id === programId} onChange={() => setProgramId(p.id)}/>
        <span><strong>{p.name}</strong><small>{p.description}</small></span>
      </label>)}
    </fieldset>
    <label>Ngày bắt đầu <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required/></label>
    <section aria-label="Xem trước giáo án" className="plan-preview">
      <h3 className="sheet-h"><Dumbbell size={15}/> Sẽ tạo {program.days.length} thói quen có lịch cố định</h3>
      <ul>{program.days.map(d => <li key={d.title}>
        <strong>{d.weekdays.map(w => DAY_NAMES[w]).join(', ')} · {d.title}</strong>
        <small>{d.groups.map(g => muscleLabel[g]).join(', ')} · {program.sessionMinutes ?? 60} phút · +{program.sessionXp ?? 50} XP khi xác nhận hoàn thành cả buổi</small>
        <ul>{d.exerciseIds.map(id => { const e = prescribed(d, id); return <li key={id}>{e.name} · {e.sets}×{e.reps}{e.unit === 'giây' ? ' giây' : ''}{e.note ? ` ${e.note}` : ''}</li>; })}</ul>
      </li>)}</ul>
      <p className="form-note">Lịch bắt đầu từ ngày bạn chọn và không đổi ngược các ngày đã qua. Có thể sửa hoặc tạm dừng từng thói quen sau.{program.goalNote ? ' Ngày hồi phục và ngày nghỉ không tạo nhiệm vụ nên không bị tính là bỏ lỡ.' : ''}</p>
    </section>
    <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={onClose}>Hủy</button><button type="button" className="btn btn-primary" disabled={saving || !startDate} onClick={submit}><Dumbbell size={16}/> {saving ? 'Đang nạp…' : 'Nạp giáo án'}</button></div>
  </div>;
}
