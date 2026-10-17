import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { LastWorkoutSetsDto, WorkoutSetDto, WorkoutSetInput } from '../api/types';
import type { Exercise } from '../domain/exerciseLibrary';
import { formatDate } from '../domain/rules';

/** What the set log needs from the API. It records what was done; it never completes a quest and gives no XP. */
export interface SetLogApi {
  list(habitId: string, date: string): Promise<WorkoutSetDto[]>;
  record(habitId: string, date: string, input: WorkoutSetInput): Promise<WorkoutSetDto[]>;
  remove(habitId: string, date: string, exercise: string, setNo: number): Promise<WorkoutSetDto[]>;
  last(exercise: string, before: string): Promise<LastWorkoutSetsDto>;
}

/** "72,5" and "72.5" both work; empty means no weight noted. Returns undefined for something that is not a valid weight. */
export function parseWeight(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 0 && n <= 1000 ? n : undefined;
}
const kg = (w: number | null) => w === null ? '' : ` · ${String(w).replace('.', ',')} kg`;
/** The smallest set number not used yet (1 when nothing is logged), at most 50. */
export const nextSetNo = (sets: readonly WorkoutSetDto[]) => { const used = new Set(sets.map(s => s.setNo)); let n = 1; while (used.has(n)) n++; return n; };

/** Loads and edits the sets of one quest. */
export function useSetLog(api: SetLogApi | undefined, habitId: string, date: string) {
  const [sets, setSets] = useState<WorkoutSetDto[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!api) return; let alive = true;
    api.list(habitId, date).then(list => { if (alive) setSets(list); }).catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Không tải được nhật ký set.'); });
    return () => { alive = false; };
  }, [api, habitId, date]);
  const run = async (call: () => Promise<WorkoutSetDto[]>): Promise<boolean> => {
    if (busy) return false; setBusy(true); setError('');
    try { setSets(await call()); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được set.'); return false; }
    finally { setBusy(false); }
  };
  return { sets, error, busy, record: (input: WorkoutSetInput) => run(() => api!.record(habitId, date, input)), remove: (exercise: string, setNo: number) => run(() => api!.remove(habitId, date, exercise, setNo)) };
}

interface Props {
  exercise: Exercise; sets: WorkoutSetDto[]; date: string; busy: boolean;
  last: SetLogApi['last']; onRecord: (input: WorkoutSetInput) => Promise<boolean>; onRemove: (exercise: string, setNo: number) => Promise<boolean>;
}

/** The sets of one exercise: what was done, what was done last time, and a row to add the next set. */
export function ExerciseSets({ exercise, sets, date, busy, last, onRecord, onRemove }: Props) {
  const mine = sets.filter(s => s.exercise.toLowerCase() === exercise.name.toLowerCase());
  const seconds = exercise.unit === 'giây';
  const [reps, setReps] = useState(String(exercise.reps));
  const [weight, setWeight] = useState('');
  const [problem, setProblem] = useState('');
  const [previous, setPrevious] = useState<LastWorkoutSetsDto | null>(null);
  useEffect(() => { let alive = true; last(exercise.name, date).then(r => { if (alive) setPrevious(r); }).catch(() => { /* "last time" is a convenience: no message when it cannot load */ }); return () => { alive = false; }; }, [last, exercise.name, date]);
  const add = async () => {
    const r = Number(reps), w = seconds ? null : parseWeight(weight);
    if (!Number.isInteger(r) || r < 1 || r > 1000) { setProblem(`Nhập số ${seconds ? 'giây' : 'rep'} từ 1 đến 1000.`); return; }
    if (w === undefined) { setProblem('Mức tạ không hợp lệ (ví dụ 42,5).'); return; }
    const no = nextSetNo(mine); if (no > 50) { setProblem('Tối đa 50 set cho một bài.'); return; }
    setProblem('');
    await onRecord({ exercise: exercise.name, setNo: no, reps: r, weightKg: w });
  };
  const unit = seconds ? 'giây' : 'rep';
  return <li className="set-exercise" aria-label={`Nhật ký set ${exercise.nameVi ?? exercise.name}`}>
    <strong>{exercise.nameVi ?? exercise.name}</strong>
    <small className="set-plan">Kế hoạch {exercise.sets} set × {exercise.reps} {unit}{exercise.note ? ` ${exercise.note}` : ''}{previous && (previous.date ? ` · Lần trước (${formatDate(previous.date, { day: 'numeric', month: 'numeric' })}): ${previous.sets.map(s => `${s.reps}${kg(s.weightKg)}`).join('; ')}` : ' · Chưa có lần trước')}</small>
    {mine.length > 0 && <ol className="set-rows">{mine.map(s => <li key={s.setNo}>
      <span>Set {s.setNo}: {s.reps} {unit}{kg(s.weightKg)}</span>
      <button type="button" className="set-del" disabled={busy} aria-label={`Xoá set ${s.setNo} của ${exercise.nameVi ?? exercise.name}`} onClick={() => onRemove(exercise.name, s.setNo)}><Trash2 size={15}/></button>
    </li>)}</ol>}
    <div className="set-add">
      <label>{seconds ? 'Giây' : 'Rep'}<input inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} aria-label={`${seconds ? 'Số giây' : 'Số rep'} ${exercise.nameVi ?? exercise.name}`}/></label>
      {!seconds && <label>kg<input inputMode="decimal" value={weight} placeholder="tuỳ chọn" onChange={e => setWeight(e.target.value)} aria-label={`Mức tạ ${exercise.nameVi ?? exercise.name}`}/></label>}
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={add} aria-label={`Ghi set ${nextSetNo(mine)} ${exercise.nameVi ?? exercise.name}`}><Plus size={15}/> Ghi set {nextSetNo(mine)}</button>
    </div>
    {problem && <p role="alert" className="set-error">{problem}</p>}
  </li>;
}
