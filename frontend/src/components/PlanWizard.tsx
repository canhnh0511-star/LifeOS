import { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import type { GoalDto, HabitDto, ImportHabitPlanRequest } from '../api/types';
import { useDialog } from '../hooks/useDialog';
import { muscleLabel, planRequest, prescribed } from '../domain/exerciseLibrary';
import { DAY_LABEL, GOALS, PLACES, SESSION_OPTIONS, buildProgram, replacementFor, type PlanChoice, type TrainPlace, type TrainingGoal } from '../domain/planBuilder';
import { todayInTimezone } from '../domain/rules';
import { RankPortrait } from './RankPortrait';

export interface Replacement { goalIds: string[]; habitIds: string[]; }
type Step = 1 | 2 | 3;
const STEPS: readonly { n: Step; label: string }[] = [{ n: 1, label: '1 · Thức tỉnh' }, { n: 2, label: '2 · Mục tiêu' }, { n: 3, label: '3 · Giáo án' }];
const WEEKDAY_NAME: Record<number, string> = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ nhật' };

/**
 * First-run flow in three steps: the story, then goal / place / frequency, then the plan those answers produce.
 * Nothing is sent before "Bắt đầu hành trình". The plan is built by `buildProgram` and imported through the ordinary plan import.
 */
export function PlanWizard({ displayName, goals, habits, onImport, onClose, onChooseProgram }: {
  displayName?: string; goals: readonly GoalDto[]; habits: readonly HabitDto[];
  onImport: (request: ImportHabitPlanRequest, replace: Replacement) => Promise<void>; onClose: () => void; onChooseProgram: () => void;
}) {
  const titleId = useId(), card = useRef<HTMLElement>(null);
  useDialog(card, onClose);
  const [step, setStep] = useState<Step>(1);
  const [choice, setChoice] = useState<PlanChoice>({ goal: 'MUSCLE', place: 'GYM', sessions: 3 });
  const [open, setOpen] = useState(0);
  const [replace, setReplace] = useState(true);
  const [saving, setSaving] = useState(false);
  const program = useMemo(() => buildProgram(choice), [choice]);
  const old = useMemo(() => replacementFor(goals, habits), [goals, habits]);
  const go = (to: Step) => { setStep(to); if (to === 3) setOpen(0); };
  const start = async () => {
    if (saving) return;
    setSaving(true);
    try { await onImport(planRequest(program, todayInTimezone()), replace ? old : { goalIds: [], habitIds: [] }); } finally { setSaving(false); }
  };
  const name = displayName?.trim();

  return <div className="wizard-backdrop">
    <section ref={card} className="wizard" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="wizard-top">
        <span className="wizard-tag">[ HỆ THỐNG ]</span>
        <button type="button" className="btn btn-quiet" onClick={onClose}>Để sau</button>
      </header>
      <ol className="wizard-steps" aria-label="Các bước">
        {STEPS.map(s => <li key={s.n} className={s.n === step ? 'is-current' : s.n < step ? 'is-done' : ''} aria-current={s.n === step ? 'step' : undefined}><span className="wizard-bar"/><span>{s.label}</span></li>)}
      </ol>

      {step === 1 && <div className="wizard-body wizard-story">
        <RankPortrait level={1} size={190}/>
        <h1 id={titleId}>Bạn là thợ săn hạng E.</h1>
        <p>Yếu nhất, và đó chính là điểm xuất phát. Mỗi buổi tập sẽ biến bạn mạnh hơn.</p>
        <div className="wizard-window"><span className="wizard-window-tag">THÔNG BÁO</span>
          <p>Hệ thống đã chọn bạn. Mỗi buổi tập là một lần vào hầm ngục, XP chỉ đến từ buổi tập thật. Nghỉ ngày nào cũng không bị phạt.</p></div>
        <p className="wizard-hunter">Thợ săn{name ? <> <strong>{name}</strong></> : ''}</p>
      </div>}

      {step === 2 && <div className="wizard-body">
        <h2 id={titleId}>Mục tiêu của bạn</h2>
        <p className="wizard-lead">Lựa chọn này quyết định bài tập, số rep và thời gian nghỉ trong giáo án.</p>
        <div className="wizard-choices" role="radiogroup" aria-label="Mục tiêu của bạn">
          {(Object.keys(GOALS) as TrainingGoal[]).map(g => <label key={g} className={`wizard-card ${choice.goal === g ? 'is-selected' : ''}`}>
            <input type="radio" name="goal" value={g} checked={choice.goal === g} onChange={() => setChoice({ ...choice, goal: g })}/>
            <span className="wizard-card-text"><strong>{GOALS[g].label}</strong><small>{GOALS[g].summary}</small>
              <span className="wizard-chips"><span>{GOALS[g].repsText}</span><span>{GOALS[g].restText}</span></span></span>
          </label>)}
        </div>
        <h3 className="wizard-sub" id={`${titleId}-place`}>Bạn tập ở đâu? <small>Chỉ hiện bài có dụng cụ bạn có</small></h3>
        <div className="wizard-pills" role="radiogroup" aria-label="Bạn tập ở đâu?">
          {(Object.keys(PLACES) as TrainPlace[]).map(p => <label key={p} className={`wizard-pill ${choice.place === p ? 'is-selected' : ''}`}>
            <input type="radio" name="place" value={p} checked={choice.place === p} onChange={() => setChoice({ ...choice, place: p })}/><span>{PLACES[p].label}</span>
          </label>)}
        </div>
        <h3 className="wizard-sub">Số buổi mỗi tuần</h3>
        <div className="wizard-pills wizard-count" role="radiogroup" aria-label="Số buổi mỗi tuần">
          {SESSION_OPTIONS.map(n => <label key={n} className={`wizard-pill ${choice.sessions === n ? 'is-selected' : ''}`}>
            <input type="radio" name="sessions" value={n} checked={choice.sessions === n} onChange={() => setChoice({ ...choice, sessions: n })}/>{n}
          </label>)}
        </div>
      </div>}

      {step === 3 && <div className="wizard-body">
        <h2 id={titleId}>Giáo án của bạn</h2>
        <div className="wizard-chips wizard-summary">
          <span>{GOALS[choice.goal].label}</span><span>{PLACES[choice.place].label}</span>
          <span>{choice.sessions} buổi/tuần: {program.days.map(d => DAY_LABEL[d.weekdays[0]]).join(' · ')}</span>
        </div>
        <ul className="wizard-sessions">
          {program.days.map((d, i) => <li key={d.title} className={i === open ? 'is-open' : ''}>
            <button type="button" aria-expanded={i === open} aria-controls={`${titleId}-s${i}`} onClick={() => setOpen(i === open ? -1 : i)}>
              <span className="wizard-session-name"><strong>{d.title}</strong>
                <small>{WEEKDAY_NAME[d.weekdays[0]]} · {d.groups.map(g => muscleLabel[g]).join(' · ')} · {d.exerciseIds.length} bài · khoảng {program.sessionMinutes} phút</small></span>
              <ChevronDown size={18} aria-hidden="true"/>
            </button>
            {i === open && <ol id={`${titleId}-s${i}`} className="wizard-exercises">
              {d.exerciseIds.map(id => { const e = prescribed(d, id); return <li key={id}><span>{e.nameVi ?? e.name}</span><span className="wizard-sets">{e.sets} × {e.reps}{e.unit === 'giây' ? ' giây' : ''}{e.note ? ` ${e.note}` : ''}</span></li>; })}
            </ol>}
          </li>)}
        </ul>
        <p className="wizard-note">Đổi bài, đổi ngày hoặc số buổi bất cứ lúc nào.</p>
        {old.habitIds.length > 0 && <label className="plan-replace"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)}/> <span>Thay giáo án đang dùng ({old.habitIds.length} buổi): lưu trữ giáo án cũ, biến mất từ ngày mai, lịch sử vẫn giữ.</span></label>}
      </div>}

      <footer className="wizard-actions">
        {step === 1 && <button type="button" className="btn btn-primary wizard-cta" onClick={() => go(2)}>Tiếp tục <ChevronRight size={18} aria-hidden="true"/></button>}
        {step === 2 && <button type="button" className="btn btn-primary wizard-cta" onClick={() => go(3)}>Tạo giáo án <ChevronRight size={18} aria-hidden="true"/></button>}
        {step === 3 && <button type="button" className="btn btn-primary wizard-cta" disabled={saving} onClick={start}><Dumbbell size={18} aria-hidden="true"/> {saving ? 'Đang tạo…' : 'Bắt đầu hành trình'}</button>}
        <div className="wizard-links">
          {step > 1 && <button type="button" className="btn btn-quiet" onClick={() => go((step - 1) as Step)}><ChevronLeft size={16} aria-hidden="true"/> Quay lại</button>}
          <button type="button" className="btn btn-quiet" onClick={onChooseProgram}>Chọn giáo án có sẵn</button>
        </div>
      </footer>
    </section>
  </div>;
}
