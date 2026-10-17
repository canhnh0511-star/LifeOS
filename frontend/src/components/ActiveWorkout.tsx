import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { QuestDto, WorkoutSetDto } from '../api/types';
import type { Exercise } from '../domain/exerciseLibrary';
import { muscleLabel } from '../domain/exerciseLibrary';
import { clock } from '../ui/focusTimer';
import { Modal } from './Modal';
import { nextSetNo, type SetLogApi } from './SetLog';

const WEIGHT_STEP = 2.5, REST_STEP = 15, REST_MIN = 15, REST_MAX = 600;
const kg = (w: number) => String(w).replace('.', ',');
const mineOf = (sets: readonly WorkoutSetDto[], e: Exercise) => sets.filter(s => s.exercise.toLowerCase() === e.name.toLowerCase());
/** The first exercise that still has planned sets to do; the last one when everything is done. */
export const firstOpenIndex = (exercises: readonly Exercise[], sets: readonly WorkoutSetDto[]) => {
  const i = exercises.findIndex(e => mineOf(sets, e).length < e.sets);
  return i === -1 ? Math.max(0, exercises.length - 1) : i;
};

interface Props {
  quest: QuestDto; date: string; exercises: Exercise[]; sets: WorkoutSetDto[]; busy: boolean; error: string;
  last: SetLogApi['last']; onRecord: (input: { exercise: string; setNo: number; reps: number; weightKg: number | null }) => Promise<boolean>; onClose: () => void;
}

/**
 * Step-by-step workout (B-38): one exercise and one set at a time, with − / + for reps, weight and rest.
 * "Hoàn thành set" records the set through the set log and starts the rest countdown. No XP and no quest completion here.
 */
export function ActiveWorkout({ quest, date, exercises, sets, busy, error, last, onRecord, onClose }: Props) {
  const [index, setIndex] = useState(() => firstOpenIndex(exercises, sets));
  const e = exercises[index]!;
  const mine = mineOf(sets, e), seconds = e.unit === 'giây';
  const setNo = nextSetNo(mine), allDone = mine.length >= e.sets;
  const [reps, setReps] = useState(e.reps);
  const [weight, setWeight] = useState(0);
  const [rest, setRest] = useState(e.restSeconds ?? 90);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const resting = restEndsAt !== null && restEndsAt > now;
  // Moving to another exercise resets the steppers to its plan and, for weights, to what was lifted last time.
  useEffect(() => {
    setReps(e.reps); setRest(e.restSeconds ?? 90); setWeight(0); let alive = true;
    const own = mineOf(sets, e); const done = own[own.length - 1];
    if (done?.weightKg) setWeight(done.weightKg);
    else last(e.name, date).then(r => { const w = r.sets.find(s => s.weightKg)?.weightKg; if (alive && w) setWeight(w); }).catch(() => { /* convenience only */ });
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
  const go = (to: number) => { setIndex(to); setRestEndsAt(null); };
  const unit = seconds ? 'giây' : 'rep';
  const stepper = (label: string, value: string, dec: () => void, inc: () => void, disDec: boolean, disInc: boolean) =>
    <div className="aw-stepper" role="group" aria-label={label}>
      <button type="button" className="aw-step" aria-label={`Giảm ${label}`} disabled={disDec} onClick={dec}><Minus size={18}/></button>
      <span className="aw-value" role="img" aria-label={`${label} hiện tại`}>{value}</span>
      <button type="button" className="aw-step" aria-label={`Tăng ${label}`} disabled={disInc} onClick={inc}><Plus size={18}/></button>
    </div>;
  return <Modal title={`Đang tập · ${quest.title}`} onClose={onClose} sheet>
    <div className="aw">
      <div className="aw-nav">
        <button type="button" className="icon-btn" aria-label="Bài trước" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={20}/></button>
        <div><small>Bài {index + 1}/{exercises.length} · {muscleLabel[e.group]}</small><h3 className="aw-name">{e.name}</h3></div>
        <button type="button" className="icon-btn" aria-label="Bài sau" disabled={index === exercises.length - 1} onClick={() => go(index + 1)}><ChevronRight size={20}/></button>
      </div>
      <div className="aw-dots" aria-label="Các set">{Array.from({ length: Math.max(e.sets, mine.length) }, (_, i) => {
        const s = mine.find(m => m.setNo === i + 1);
        return <span key={i} className={`aw-dot${s ? ' is-done' : i + 1 === setNo ? ' is-now' : ''}`}>{s ? `${s.reps}${s.weightKg ? ` × ${kg(s.weightKg)}` : ''}` : i + 1}</span>;
      })}</div>
      {allDone
        ? <p role="status" className="aw-done"><Check size={16}/> Đã xong {mine.length}/{e.sets} set bài này.</p>
        : <>
          <p className="aw-set">Set {setNo} / {e.sets} <small>Mục tiêu {e.reps} {unit}{e.note ? ` ${e.note}` : ''}</small></p>
          {stepper(seconds ? 'giây' : 'rep', `${reps}`, () => setReps(r => Math.max(1, r - 1)), () => setReps(r => Math.min(1000, r + 1)), reps <= 1, reps >= 1000)}
          {!seconds && stepper('mức tạ (kg)', weight ? kg(weight) : '—', () => setWeight(w => Math.max(0, w - WEIGHT_STEP)), () => setWeight(w => Math.min(1000, w + WEIGHT_STEP)), weight <= 0, weight >= 1000)}
          <button type="button" className="btn btn-primary aw-complete" disabled={busy} onClick={complete}><Check size={18}/> Hoàn thành set</button>
        </>}
      <section aria-label="Nghỉ giữa set" className="sheet-timer">
        {resting ? <><div className="sheet-clock" role="timer" aria-live="off">{clock(restLeft)}</div><button type="button" className="btn btn-quiet" onClick={() => setRestEndsAt(null)}>Bỏ qua nghỉ</button></>
          : <>{restOver && <p role="status">Hết giờ nghỉ, vào set tiếp theo.</p>}
            <div className="aw-rest"><span>Nghỉ</span>{stepper('thời gian nghỉ', `${rest} giây`, () => setRest(r => Math.max(REST_MIN, r - REST_STEP)), () => setRest(r => Math.min(REST_MAX, r + REST_STEP)), rest <= REST_MIN, rest >= REST_MAX)}</div></>}
      </section>
      {error && <p role="alert" className="set-error">{error}</p>}
      <div className="sheet-actions">
        {allDone && index < exercises.length - 1 && <button type="button" className="btn btn-secondary" onClick={() => go(index + 1)}>Bài tiếp theo <ChevronRight size={16}/></button>}
        <button type="button" className="btn btn-quiet" onClick={onClose}>Thoát</button>
      </div>
      <p className="form-note">Chỉ ghi lại set bạn đã làm, không cộng XP. Hoàn thành buổi vẫn bằng nút xác nhận trong chi tiết nhiệm vụ.</p>
    </div>
  </Modal>;
}
