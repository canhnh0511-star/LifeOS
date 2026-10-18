import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, Info, Minus, Pause, Play, Plus, Undo2, X } from 'lucide-react';
import type { LastWorkoutSetsDto, QuestDto, WorkoutSetDto } from '../api/types';
import type { Exercise } from '../domain/exerciseLibrary';
import { muscleLabel } from '../domain/exerciseLibrary';
import { sessionSummary } from '../domain/sessionSummary';
import { number } from '../ui/format';
import { useDialog } from '../hooks/useDialog';
import { infoFor } from '../domain/exerciseInfo';
import { ExercisePicture } from './ExercisePicture';
import { guideFor } from '../domain/exerciseGuide';
import { clock, elapsedMs, isRunning, pauseTimer, startTimer, type TimerState } from '../ui/focusTimer';
import { ProgressBar } from './primitives';
import { ExerciseThumb } from './ExercisePicture';
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
  last: SetLogApi['last']; onRemove: (exercise: string, setNo: number) => Promise<boolean>;
  onRecord: (input: { exercise: string; setNo: number; reps: number; weightKg: number | null }) => Promise<boolean>;
  /** ends the session: the same confirmation as the button in the quest detail */ onFinish?: () => void; xp?: number;
  /** the session stopwatch of the quest, owned by the quest detail so both show the same time */ timer: TimerState; onTimer: (next: TimerState) => void;
  onClose: () => void;
}

/**
 * The workout as its own full screen, one step at a time (B-38, redesigned): a set screen (picture, reps, weight, one big button), then a
 * rest screen with the countdown, then the next set, exercise by exercise, until a final screen. The session stopwatch sits in the header
 * of every step and is the quest's own stopwatch. Recording a set gives no XP and never completes the quest; only "Kết thúc buổi tập" asks for that.
 */
export function WorkoutRunner({ quest, date, exercises, sets, busy, error, last, onRecord, onRemove, onFinish, xp, timer, onTimer, onClose }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(() => firstOpenIndex(exercises, sets));
  const e = exercises[index]!;
  const mine = mineOf(sets, e), seconds = e.unit === 'giây', unit = seconds ? 'giây' : 'rep';
  const setNo = nextSetNo(mine), allDone = mine.length >= e.sets;
  const sessionDone = exercises.every(x => mineOf(sets, x).length >= x.sets);
  const totalSets = exercises.reduce((n, x) => n + x.sets, 0), doneSets = exercises.reduce((n, x) => n + Math.min(x.sets, mineOf(sets, x).length), 0);
  const [reps, setReps] = useState(e.reps);
  const [weight, setWeight] = useState(0);
  const [rest, setRest] = useState<{ endsAt: number; exerciseId: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [previous, setPrevious] = useState<LastWorkoutSetsDto | null>(null);
  const running = isRunning(timer);
  const close = () => { onTimer(pauseTimer(timer, Date.now())); onClose(); };
  useDialog(card, close);
  // The stopwatch starts with the workout; leaving pauses it. The page behind does not scroll.
  useEffect(() => { if (!isRunning(timer)) onTimer(startTimer(timer, Date.now())); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  // Moving to another exercise resets the steppers to its plan and, for weights, to what was lifted last time.
  useEffect(() => {
    setReps(e.reps); setWeight(0); setPrevious(null); setShowInfo(false); let alive = true;
    const own = mineOf(sets, e); const done = own[own.length - 1];
    if (done?.weightKg) setWeight(done.weightKg);
    last(e.name, date).then(r => { if (!alive) return; setPrevious(r); const w = r.sets.find(s => s.weightKg)?.weightKg; if (w && !done?.weightKg) setWeight(w); }).catch(() => { /* convenience only */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.id]);
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  const restOver = rest !== null && rest.endsAt <= now;
  useEffect(() => { if (restOver) try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ } }, [restOver]);

  const complete = async () => {
    const ok = await onRecord({ exercise: e.name, setNo, reps, weightKg: seconds || weight === 0 ? null : weight });
    if (!ok) return;
    const exerciseDone = mine.length + 1 >= e.sets;
    const open = exercises.map((x, i) => i === index ? (exerciseDone ? 0 : 1) : mineOf(sets, x).length < x.sets ? 1 : 0);
    if (!open.some(Boolean)) return; // the last set of the session: the final screen takes over
    const next = exerciseDone ? (open.findIndex((v, i) => v && i > index) !== -1 ? open.findIndex((v, i) => v && i > index) : open.findIndex(Boolean)) : index;
    const t = Date.now(); setNow(t); setRest({ endsAt: t + savedRest(e) * 1000, exerciseId: e.id }); setIndex(next);
  };
  const adjustRest = (delta: number) => {
    if (!rest) return;
    const src = exercises.find(x => x.id === rest.exerciseId) ?? e;
    try { localStorage.setItem(restKey(src.id), String(Math.min(REST_MAX, Math.max(REST_MIN, savedRest(src) + delta)))); } catch { /* not saved */ }
    setRest({ ...rest, endsAt: Math.max(Date.now(), rest.endsAt + delta * 1000) });
  };
  const go = (to: number) => { setIndex(to); setRest(null); setReviewing(false); };
  const step = (label: string, value: React.ReactNode, dec: () => void, inc: () => void, disDec: boolean, disInc: boolean, caption: string) =>
    <div className="aw-field"><span className="aw-label">{caption}</span><div className="aw-stepper" role="group" aria-label={label}>
      <button type="button" className="aw-step" aria-label={`Giảm ${label}`} disabled={disDec} onClick={dec}><Minus size={20}/></button>
      {value}
      <button type="button" className="aw-step" aria-label={`Tăng ${label}`} disabled={disInc} onClick={inc}><Plus size={20}/></button>
    </div></div>;

  const header = <header className="wr-head">
    <button type="button" className="icon-btn" aria-label="Tạm dừng buổi tập" onClick={close}><X size={22}/></button>
    <div className="wr-clock" role="timer" aria-label="Thời gian buổi tập" aria-live="off"><small>Buổi tập</small><strong>{clock(elapsedMs(timer, now) / 1000)}</strong></div>
    <button type="button" className="icon-btn" aria-label={running ? 'Dừng đồng hồ buổi tập' : 'Chạy đồng hồ buổi tập'} onClick={() => onTimer(running ? pauseTimer(timer, Date.now()) : startTimer(timer, Date.now()))}>{running ? <Pause size={20}/> : <Play size={20}/>}</button>
    <div className="wr-progress" role="group" aria-label="Tiến độ buổi tập"><ProgressBar value={Math.round(doneSets / Math.max(1, totalSets) * 100)} variant="green" size="slim"/><small>Đã xong {doneSets}/{totalSets} set</small></div>
  </header>;

  let main: React.ReactNode, foot: React.ReactNode;
  if (rest) {
    const next = exercises[index]!, nextNo = nextSetNo(mineOf(sets, next));
    main = <div className="wr-rest" role="region" aria-label="Nghỉ giữa set">
      <p className="wr-kicker">Nghỉ giữa set</p>
      <div className="wr-rest-clock" role="timer" aria-label="Thời gian nghỉ" aria-live="off">{restOver ? '00:00' : clock(restLeft)}</div>
      {restOver ? <p role="status" className="wr-over">Hết giờ nghỉ.</p>
        : <div className="wr-rest-adjust"><button type="button" className="btn btn-quiet" aria-label="Giảm thời gian nghỉ" onClick={() => adjustRest(-REST_STEP)}><Minus size={16}/> 15 giây</button>
            <button type="button" className="btn btn-quiet" aria-label="Tăng thời gian nghỉ" onClick={() => adjustRest(REST_STEP)}><Plus size={16}/> 15 giây</button></div>}
      <div className="wr-next"><ExerciseThumb exercise={next} size={56}/><span><small>Tiếp theo</small><strong>{next.nameVi ?? next.name}</strong><small>Set {nextNo} / {next.sets} · {next.reps} {next.unit === 'giây' ? 'giây' : 'rep'}</small></span></div>
    </div>;
    foot = <button type="button" className={`btn ${restOver ? 'btn-primary' : 'btn-secondary'} wr-cta`} onClick={() => setRest(null)}>{restOver ? <>Vào set tiếp theo <ChevronRight size={18}/></> : 'Bỏ qua nghỉ'}</button>;
  } else if (sessionDone && !reviewing) {
    const sm = sessionSummary(exercises, sets, elapsedMs(timer, now));
    main = <div className="wr-final" role="region" aria-label="Hoàn thành buổi tập">
      <p className="wr-kicker">Hoàn thành</p><h2>Xong hết các set!</h2>
      <dl className="wr-stats"><div><dt>Bài tập</dt><dd>{sm.exercisesDone}/{sm.exercisesTotal}</dd></div><div><dt>Set</dt><dd>{sm.setsDone}/{sm.setsPlanned}</dd></div>
        {sm.volumeKg > 0 && <div><dt>Khối lượng</dt><dd>{number(sm.volumeKg)} kg</dd></div>}<div><dt>Thời gian</dt><dd>{clock(elapsedMs(timer, now) / 1000)}</dd></div></dl>
      <p className="form-note">Ghi set không cộng XP. XP chỉ có khi bạn xác nhận kết thúc buổi tập.</p>
    </div>;
    foot = <>{onFinish && <button type="button" className="btn btn-primary wr-cta" disabled={busy} onClick={() => { onTimer(pauseTimer(timer, Date.now())); onFinish(); }}><Check size={18}/> Kết thúc buổi tập{xp ? ` · +${xp} XP` : ''}</button>}
      <button type="button" className="btn btn-quiet" onClick={() => setReviewing(true)}>Xem lại các bài</button></>;
  } else {
    main = <div className="wr-set">
      <p className="wr-kicker">Bài {index + 1}/{exercises.length} · {muscleLabel[e.group]}</p>
      <h2 className="wr-name">{e.nameVi ?? e.name}</h2>
      <div className="wr-pic"><ExercisePicture exercise={e} compact/></div>
      <p className="aw-cue" aria-label="Gợi ý động tác">{guideFor(e.id)?.steps[0] ?? infoFor(e).cues[0]}</p>
      {previous && previous.date && previous.sets.length > 0 && <p className="aw-last">Lần trước ({shortDate(previous.date)}): {previous.sets.map(x => setText(x, unit)).join(' · ')}</p>}
      <button type="button" className="btn btn-quiet aw-info" aria-expanded={showInfo} onClick={() => setShowInfo(v => !v)}><Info size={15}/> {showInfo ? 'Ẩn kỹ thuật' : 'Kỹ thuật'}</button>
      {showInfo && <ExerciseDetail exercise={e} showPicture={false} onClose={() => setShowInfo(false)}/>}
      <div className="aw-dots" aria-label="Các set">{Array.from({ length: Math.max(e.sets, mine.length) }, (_, i) => {
        const s = mine.find(m => m.setNo === i + 1);
        return <span key={i} aria-label={s ? `Set ${i + 1}: xong, ${s.reps} ${unit}${s.weightKg ? `, ${kg(s.weightKg)} kg` : ''}` : `Set ${i + 1}: ${i + 1 === setNo ? 'đang làm' : 'chưa làm'}`} className={`aw-dot${s ? ' is-done' : i + 1 === setNo ? ' is-now' : ''}`}>{s ? <><Check size={13} aria-hidden="true"/> {s.reps}{s.weightKg ? ` × ${kg(s.weightKg)}` : ''}</> : `Set ${i + 1}`}</span>;
      })}</div>
      {allDone
        ? <p role="status" className="aw-done"><Check size={16}/> Đã xong {mine.length}/{e.sets} set bài này.</p>
        : <>
          <p className="aw-set">Set {setNo} / {e.sets} <small>Mục tiêu {e.reps} {unit}{e.note ? ` ${e.note}` : ''}</small></p>
          <div className={`wr-steppers${seconds ? ' is-single' : ''}`}>
          {step(seconds ? 'giây' : 'rep', <NumberField label={seconds ? 'giây' : 'rep'} value={reps} onValue={setReps} min={1} max={1000}/>, () => setReps(r => Math.max(1, r - 1)), () => setReps(r => Math.min(1000, r + 1)), reps <= 1, reps >= 1000, seconds ? 'Thời gian giữ (giây)' : 'Số lần (rep)')}
          {!seconds && step('mức tạ (kg)', <NumberField label="mức tạ (kg)" value={weight} empty="" decimal onValue={setWeight} min={0} max={1000}/>, () => setWeight(w => Math.max(0, w - WEIGHT_STEP)), () => setWeight(w => Math.min(1000, w + WEIGHT_STEP)), weight <= 0, weight >= 1000, 'Mức tạ (kg)')}
          </div>
        </>}
      {mine.length > 0 && <button type="button" className="btn btn-quiet wr-undo" disabled={busy} onClick={() => onRemove(e.name, mine[mine.length - 1]!.setNo)}><Undo2 size={15}/> Xoá set {mine[mine.length - 1]!.setNo} vừa ghi</button>}
      <div className="wr-nav">
        <button type="button" className="btn btn-quiet" aria-label="Bài trước" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={16}/> Bài trước</button>
        <button type="button" className="btn btn-quiet" aria-label="Bài sau" disabled={index === exercises.length - 1} onClick={() => go(index + 1)}>Bài sau <ChevronRight size={16}/></button>
      </div>
      {error && <p role="alert" className="set-error">{error}</p>}
    </div>;
    foot = allDone
      ? (index < exercises.length - 1 ? <button type="button" className="btn btn-primary wr-cta" onClick={() => go(index + 1)}>Bài tiếp theo <ChevronRight size={18}/></button>
        : sessionDone ? <button type="button" className="btn btn-primary wr-cta" onClick={() => setReviewing(false)}>Xong, quay lại tổng kết</button> : null)
      : <button type="button" className="btn btn-primary wr-cta" disabled={busy} onClick={complete}><Check size={20}/> Hoàn thành set</button>;
  }
  return createPortal(<div className="wr" role="dialog" aria-modal="true" aria-label={`Buổi tập · ${quest.title}`}>
    <div ref={card} className="wr-card" tabIndex={-1}>
      {header}
      <div className="wr-body">{main}</div>
      <footer className="wr-foot">{foot}</footer>
    </div>
  </div>, document.body);
}
