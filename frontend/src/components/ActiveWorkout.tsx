import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Info, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import type { LastWorkoutSetsDto, QuestDto, WorkoutSetDto } from '../api/types';
import type { Exercise } from '../domain/exerciseLibrary';
import { muscleLabel } from '../domain/exerciseLibrary';
import { infoFor } from '../domain/exerciseInfo';
import { guideFor } from '../domain/exerciseGuide';
import { clock } from '../ui/focusTimer';
import { InlinePanel } from './InlinePanel';
import { ProgressBar } from './primitives';
import { ExerciseDetail } from './ExerciseDetail';
import { nextSetNo, type SetLogApi } from './SetLog';

const WEIGHT_STEP = 2.5, REST_STEP = 15, REST_MIN = 15, REST_MAX = 600;
const restKey = (id: string) => `lifeos.rest.${id}`;
/** Rest chosen for an exercise last time (a local preference); the plan's rest when none or unreadable. */
function savedRest(e: Exercise): number {
  try { const n = Number(localStorage.getItem(restKey(e.id))); if (Number.isInteger(n) && n >= 15 && n <= 600) return n; } catch { /* no storage */ }
  return e.restSeconds ?? 90;
}
const kg = (w: number) => String(w).replace('.', ',');
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** "10 × 40 kg" for one set, "10 giây" for a hold. */
const setText = (s: { reps: number; weightKg: number | null }, unit: string) => s.weightKg ? `${s.reps} × ${kg(s.weightKg)} kg` : `${s.reps} ${unit}`;
const mineOf = (sets: readonly WorkoutSetDto[], e: Exercise) => sets.filter(s => s.exercise.toLowerCase() === e.name.toLowerCase());
/** The first exercise that still has planned sets to do; the last one when everything is done. */
export const firstOpenIndex = (exercises: readonly Exercise[], sets: readonly WorkoutSetDto[]) => {
  const i = exercises.findIndex(e => mineOf(sets, e).length < e.sets);
  return i === -1 ? Math.max(0, exercises.length - 1) : i;
};

/** A big number you can tap + / − or simply type; typing never commits something out of range, and the text follows the value when buttons change it. */
function NumberField({ label, value, empty, onValue, decimal = false, min, max }: { label: string; value: number; empty?: string; onValue: (n: number) => void; decimal?: boolean; min: number; max: number }) {
  const show = (v: number) => (v === 0 && empty !== undefined ? empty : kg(v));
  const [text, setText] = useState(show(value));
  useEffect(() => { setText(show(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input className="aw-value" inputMode={decimal ? 'decimal' : 'numeric'} aria-label={`${label} hiện tại`} value={text} placeholder={empty}
    onFocus={e => e.currentTarget.select()}
    onChange={e => { setText(e.target.value); const n = Number(e.target.value.trim().replace(',', '.')); if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max && (decimal || Number.isInteger(n))) onValue(n); }}
    onBlur={() => setText(show(value))}/>;
}

interface Props {
  quest: QuestDto; date: string; exercises: Exercise[]; sets: WorkoutSetDto[]; busy: boolean; error: string;
  last: SetLogApi['last']; onRemove: (exercise: string, setNo: number) => Promise<boolean>; /** ends the session: the same confirmation as the button in the quest detail */ onFinish?: () => void; xp?: number; onRecord: (input: { exercise: string; setNo: number; reps: number; weightKg: number | null }) => Promise<boolean>; onClose: () => void;
}

/**
 * Step-by-step workout (B-38): one exercise and one set at a time, with − / + for reps, weight and rest.
 * "Hoàn thành set" records the set through the set log and starts the rest countdown. No XP and no quest completion here.
 */
export function ActiveWorkout({ quest, date, exercises, sets, busy, error, last, onRecord, onRemove, onFinish, xp, onClose }: Props) {
  const [index, setIndex] = useState(() => firstOpenIndex(exercises, sets));
  const e = exercises[index]!;
  const mine = mineOf(sets, e), seconds = e.unit === 'giây';
  const setNo = nextSetNo(mine), allDone = mine.length >= e.sets;
  const sessionDone = exercises.every(x => mineOf(sets, x).length >= x.sets);
  const [reps, setReps] = useState(e.reps);
  const [weight, setWeight] = useState(0);
  const [rest, setRest] = useState(() => savedRest(e));
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showInfo, setShowInfo] = useState(false);
  const [previous, setPrevious] = useState<LastWorkoutSetsDto | null>(null);
  const doneExercises = exercises.filter(x => mineOf(sets, x).length >= x.sets).length;
  const resting = restEndsAt !== null && restEndsAt > now;
  // Moving to another exercise resets the steppers to its plan and, for weights, to what was lifted last time.
  useEffect(() => {
    setReps(e.reps); setRest(savedRest(e)); setWeight(0); setPrevious(null); let alive = true;
    const own = mineOf(sets, e); const done = own[own.length - 1];
    if (done?.weightKg) setWeight(done.weightKg);
    last(e.name, date).then(r => { if (!alive) return; setPrevious(r); const w = r.sets.find(s => s.weightKg)?.weightKg; if (w && !done?.weightKg) setWeight(w); }).catch(() => { /* convenience only */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.id]);
  useEffect(() => { if (!resting) return; const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, [resting]);
  const restLeft = restEndsAt === null ? 0 : Math.max(0, Math.ceil((restEndsAt - now) / 1000));
  const restOver = restEndsAt !== null && restEndsAt <= now;
  const complete = async () => {
    const ok = await onRecord({ exercise: e.name, setNo, reps, weightKg: seconds || weight === 0 ? null : weight });
    if (ok && mine.length + 1 < e.sets) { const t = Date.now(); setNow(t); setRestEndsAt(t + rest * 1000); }
  };
  const changeRest = (n: number) => { setRest(n); try { localStorage.setItem(restKey(e.id), String(n)); } catch { /* not saved */ } };
  const go = (to: number) => { setIndex(to); setRestEndsAt(null); };
  const unit = seconds ? 'giây' : 'rep';
  const stepper = (label: string, value: React.ReactNode, dec: () => void, inc: () => void, disDec: boolean, disInc: boolean, caption?: string) =>
    <div className="aw-field">{caption && <span className="aw-label">{caption}</span>}<div className="aw-stepper" role="group" aria-label={label}>
      <button type="button" className="aw-step" aria-label={`Giảm ${label}`} disabled={disDec} onClick={dec}><Minus size={18}/></button>
      {typeof value === 'object' ? value : <span className="aw-value" role="img" aria-label={`${label} hiện tại`}>{value}</span>}
      <button type="button" className="aw-step" aria-label={`Tăng ${label}`} disabled={disInc} onClick={inc}><Plus size={18}/></button>
    </div></div>;
  return <InlinePanel title={`Đang tập · ${quest.title}`} onClose={onClose}>
    <div className="aw">
      <div role="group" aria-label="Tiến độ buổi tập" className="aw-progress"><strong>Đã xong {doneExercises}/{exercises.length} bài</strong><ProgressBar value={Math.round(doneExercises / exercises.length * 100)} variant="green" size="slim"/></div>
      <div className="aw-nav">
        <button type="button" className="icon-btn" aria-label="Bài trước" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={20}/></button>
        <div><small>Tầng {index + 1}/{exercises.length} · {muscleLabel[e.group]}</small><h3 className="aw-name">{e.nameVi ?? e.name}</h3><small className="aw-name-en" lang="en">{e.name}</small><p className="aw-cue" aria-label="Gợi ý động tác">{guideFor(e.id)?.steps[0] ?? infoFor(e).cues[0]}</p>{previous && previous.date && previous.sets.length > 0 && <p className="aw-last">Lần trước ({shortDate(previous.date)}): {previous.sets.map(x => setText(x, unit)).join(' · ')}</p>}<button type="button" className="btn btn-quiet aw-info" aria-expanded={showInfo} onClick={() => setShowInfo(v => !v)}><Info size={15}/> {showInfo ? 'Ẩn kỹ thuật' : 'Kỹ thuật'}</button></div>
        <button type="button" className="icon-btn" aria-label="Bài sau" disabled={index === exercises.length - 1} onClick={() => go(index + 1)}><ChevronRight size={20}/></button>
      </div>
      {showInfo && <ExerciseDetail exercise={e} onClose={() => setShowInfo(false)}/>}
      <div className="aw-dots" aria-label="Các set">{Array.from({ length: Math.max(e.sets, mine.length) }, (_, i) => {
        const s = mine.find(m => m.setNo === i + 1);
        return <span key={i} aria-label={s ? `Set ${i + 1}: xong, ${s.reps} ${unit}${s.weightKg ? `, ${kg(s.weightKg)} kg` : ''}` : `Set ${i + 1}: ${i + 1 === setNo ? 'đang làm' : 'chưa làm'}`} className={`aw-dot${s ? ' is-done' : i + 1 === setNo ? ' is-now' : ''}`}>{s ? <><Check size={13} aria-hidden="true"/> {s.reps}{s.weightKg ? ` × ${kg(s.weightKg)}` : ''}</> : `Set ${i + 1}`}</span>;
      })}</div>
      {mine.length > 0 && <ul className="aw-sets">{mine.map(m => <li key={m.setNo}><span>Set {m.setNo}: {m.reps} {unit}{m.weightKg ? ` · ${kg(m.weightKg)} kg` : ''}</span>
        <button type="button" className="set-del" disabled={busy} aria-label={`Xoá set ${m.setNo} của ${e.nameVi ?? e.name}`} onClick={() => onRemove(e.name, m.setNo)}><Trash2 size={15}/></button></li>)}</ul>}
      {allDone
        ? <p role="status" className="aw-done"><Check size={16}/> Đã xong {mine.length}/{e.sets} set bài này.</p>
        : <>
          <p className="aw-set">Set {setNo} / {e.sets} <small>Mục tiêu {e.reps} {unit}{e.note ? ` ${e.note}` : ''}</small></p>
          {stepper(seconds ? 'giây' : 'rep', <NumberField label={seconds ? 'giây' : 'rep'} value={reps} onValue={setReps} min={1} max={1000}/>, () => setReps(r => Math.max(1, r - 1)), () => setReps(r => Math.min(1000, r + 1)), reps <= 1, reps >= 1000, seconds ? 'Thời gian giữ (giây)' : 'Số lần (rep)')}
          {!seconds && stepper('mức tạ (kg)', <NumberField label="mức tạ (kg)" value={weight} empty="" decimal onValue={setWeight} min={0} max={1000}/>, () => setWeight(w => Math.max(0, w - WEIGHT_STEP)), () => setWeight(w => Math.min(1000, w + WEIGHT_STEP)), weight <= 0, weight >= 1000, 'Mức tạ (kg), bỏ trống nếu không dùng tạ')}
          <button type="button" className="btn btn-primary aw-complete" disabled={busy} onClick={complete}><Check size={18}/> Hoàn thành set</button>
        </>}
      <section aria-label="Nghỉ giữa set" className="sheet-timer">
        {resting ? <><div className="sheet-clock" role="timer" aria-live="off">{clock(restLeft)}</div><button type="button" className="btn btn-quiet" onClick={() => setRestEndsAt(null)}>Bỏ qua nghỉ</button></>
          : <>{restOver && <p role="status">Hết giờ nghỉ, vào set tiếp theo.</p>}
            <div className="aw-rest"><span>Nghỉ</span>{stepper('thời gian nghỉ', `${rest} giây`, () => changeRest(Math.max(REST_MIN, rest - REST_STEP)), () => changeRest(Math.min(REST_MAX, rest + REST_STEP)), rest <= REST_MIN, rest >= REST_MAX)}</div></>}
      </section>
      {error && <p role="alert" className="set-error">{error}</p>}
      {sessionDone && onFinish && <button type="button" className="btn btn-primary aw-complete" disabled={busy} onClick={onFinish}><Check size={18}/> Kết thúc buổi tập{xp ? ` · +${xp} XP` : ''}</button>}
      <div className="sheet-actions">
        {allDone && index < exercises.length - 1 && <button type="button" className="btn btn-secondary" onClick={() => go(index + 1)}>Bài tiếp theo <ChevronRight size={16}/></button>}
        <button type="button" className="btn btn-quiet" onClick={onClose}>Tạm dừng</button>
      </div>
      <p className="form-note">Các set đã ghi được lưu ngay; bấm Tạm dừng để nghỉ và tiếp tục sau. Ghi set không cộng XP, XP chỉ có khi bạn xác nhận hoàn thành buổi.</p>
    </div>
  </InlinePanel>;
}
