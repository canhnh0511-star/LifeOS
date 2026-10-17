import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { HabitDto, ObjectiveInput } from '../api/types';
import { EXERCISES, isGymHabit, muscleLabel, withExercise, type Exercise, type MuscleGroup } from '../domain/exerciseLibrary';
import { infoFor, levelLabel } from '../domain/exerciseInfo';
import { Modal } from './Modal';
import { ExerciseDetail } from './ExerciseDetail';
import { MuscleFigure } from './MuscleFigure';

const GROUPS = Object.keys(muscleLabel) as MuscleGroup[];
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
/** Filter by muscle group (null = all) and by a search text that ignores case and Vietnamese accents; matches the name, group and equipment. */
export function filterExercises(list: readonly Exercise[], group: MuscleGroup | null, query: string): Exercise[] {
  const q = plain(query.trim());
  return list.filter(e => (!group || e.group === group) && (!q || plain(`${e.name} ${muscleLabel[e.group]} ${infoFor(e).equipment}`).includes(q)));
}

/** The exercise library (B-39): search, filter by muscle group, open an exercise for its detail. */
function AddToSession({ exercise, habits, onAdd }: { exercise: Exercise; habits: HabitDto[]; onAdd: (habitId: string, objectives: ObjectiveInput[]) => Promise<void> }) {
  const sessions = habits.filter(isGymHabit);
  const [id, setId] = useState(sessions[0]?.id ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (sessions.length === 0) return <p className="form-note">Chưa có buổi tập nào. Nạp giáo án gym ở Hành trình để thêm bài vào buổi.</p>;
  const habit = sessions.find(h => h.id === id) ?? sessions[0];
  const add = async () => {
    const next = withExercise(habit, exercise);
    if (!next) { setMsg({ ok: false, text: `${habit.title} đã có bài này.` }); return; }
    setBusy(true);
    try { await onAdd(habit.id, next); setMsg({ ok: true, text: `Đã thêm vào ${habit.title}. Danh sách mới có hiệu lực từ ngày mai, các ngày đã qua giữ nguyên.` }); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Không thêm được bài.' }); }
    finally { setBusy(false); }
  };
  return <section aria-label="Thêm vào buổi tập" className="xd-add">
    <h3 className="sheet-h">Thêm vào buổi tập</h3>
    <select aria-label="Chọn buổi tập" value={habit.id} onChange={e => { setId(e.target.value); setMsg(null); }}>{sessions.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select>
    <button type="button" className="btn btn-primary" disabled={busy} onClick={add}>Thêm {exercise.sets}×{exercise.reps} {exercise.unit === 'giây' ? 'giây' : 'rep'}</button>
    {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'form-note' : 'set-error'}>{msg.text}</p>}
  </section>;
}

export function ExerciseLibrary({ onClose, habits, onAddToHabit }: { onClose: () => void; habits?: HabitDto[]; onAddToHabit?: (habitId: string, objectives: ObjectiveInput[]) => Promise<void> }) {
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Exercise | null>(null);
  const shown = useMemo(() => filterExercises(EXERCISES, group, query), [group, query]);
  if (open) return <ExerciseDetail exercise={open} onClose={() => setOpen(null)} action={habits && onAddToHabit && <AddToSession exercise={open} habits={habits} onAdd={onAddToHabit}/>}/>;
  return <Modal title="Thư viện bài tập" onClose={onClose} sheet>
    <div className="xl">
      <label className="xl-search"><Search size={16}/><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm bài tập, nhóm cơ, dụng cụ" aria-label="Tìm bài tập"/></label>
      <div className="xl-groups" role="group" aria-label="Lọc theo nhóm cơ">
        <button type="button" className={`xl-chip${group === null ? ' is-on' : ''}`} aria-pressed={group === null} onClick={() => setGroup(null)}>Tất cả <b>{EXERCISES.length}</b></button>
        {GROUPS.map(g => <button type="button" key={g} className={`xl-chip${group === g ? ' is-on' : ''}`} aria-pressed={group === g} onClick={() => setGroup(group === g ? null : g)}>{muscleLabel[g]} <b>{EXERCISES.filter(e => e.group === g).length}</b></button>)}
      </div>
      <p className="form-note" role="status">{shown.length} bài</p>
      {shown.length === 0 ? <p className="xl-empty">Không có bài nào khớp. Thử bỏ bớt từ khoá hoặc chọn nhóm cơ khác.</p>
        : <ul className="xl-list">{shown.map(e => <li key={e.id}><button type="button" className="xl-item" onClick={() => setOpen(e)} aria-label={`Chi tiết ${e.name}`}>
          <MuscleFigure primary={e.group} size={28}/><span><strong>{e.name}</strong><small>{muscleLabel[e.group]} · {infoFor(e).equipment} · {levelLabel[infoFor(e).level]}</small></span><small className="xl-plan">{e.sets}×{e.reps}</small>
        </button></li>)}</ul>}
    </div>
  </Modal>;
}
