import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';
import type { GoalDto, HabitDto, TrainingPlanDto } from '../api/types';
import { useDialog } from '../hooks/useDialog';
import { exerciseByName, muscleLabel, viName } from '../domain/exerciseLibrary';
import { DAY_LABEL, replacementFor } from '../domain/plan';
import { RankPortrait } from './RankPortrait';

export interface Replacement { goalIds: string[]; habitIds: string[]; }
type Step = 1 | 2;
const STEPS: readonly { n: Step; label: string }[] = [{ n: 1, label: '1 · Thức tỉnh' }, { n: 2, label: '2 · Giáo án' }];
const WEEKDAY_NAME: Record<number, string> = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ nhật' };

/**
 * First-run flow in two steps: the story, then the account's plan. There is one plan; it comes from the backend (`loadPlan`) and nothing is
 * created before "Bắt đầu hành trình", which calls `onStart`.
 */
export function PlanWizard({ displayName, goals, habits, loadPlan, onStart, onClose }: {
  displayName?: string; goals: readonly GoalDto[]; habits: readonly HabitDto[];
  loadPlan: () => Promise<TrainingPlanDto>; onStart: (replace: Replacement) => Promise<void>; onClose: () => void;
}) {
  const titleId = useId(), card = useRef<HTMLElement>(null);
  useDialog(card, onClose);
  const [step, setStep] = useState<Step>(1);
  const [plan, setPlan] = useState<TrainingPlanDto | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(0);
  const [replace, setReplace] = useState(true);
  const [saving, setSaving] = useState(false);
  const old = replacementFor(goals, habits);
  useEffect(() => {
    let alive = true; setFailed(false);
    loadPlan().then(p => { if (alive) setPlan(p); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [loadPlan, attempt]);
  const start = async () => {
    if (saving) return;
    setSaving(true);
    try { await onStart(replace ? old : { goalIds: [], habitIds: [] }); } finally { setSaving(false); }
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
        <h2 id={titleId}>Giáo án của bạn</h2>
        {failed ? <><p role="alert" className="set-error">Không tải được giáo án.</p><button type="button" className="btn btn-secondary" onClick={() => setAttempt(n => n + 1)}>Thử lại</button></>
          : !plan ? <p className="form-note" role="status">Đang tải giáo án…</p>
          : <>
            <div className="wizard-chips wizard-summary">
              <span>{plan.sessions.length} buổi/tuần: {plan.sessions.map(s => DAY_LABEL[s.weekdays[0]]).join(' · ')}</span>
              <span>khoảng {Math.max(...plan.sessions.map(s => s.targetMinutes))} phút/buổi</span>
            </div>
            <ul className="wizard-sessions">
              {plan.sessions.map((s, i) => { const groups = [...new Set(s.objectives.flatMap(o => { const e = exerciseByName(o.title); return e ? [e.group] : []; }))];
                return <li key={s.title} className={i === open ? 'is-open' : ''}>
                  <button type="button" aria-expanded={i === open} aria-controls={`${titleId}-s${i}`} onClick={() => setOpen(i === open ? -1 : i)}>
                    <span className="wizard-session-name"><strong>{s.title}</strong>
                      <small>{WEEKDAY_NAME[s.weekdays[0]]} · {groups.map(g => muscleLabel[g]).join(' · ')} · {s.objectives.length} bài</small></span>
                    <ChevronDown size={18} aria-hidden="true"/>
                  </button>
                  {i === open && <ol id={`${titleId}-s${i}`} className="wizard-exercises">
                    {s.objectives.map(o => <li key={o.title}><span>{viName(o.title)}</span><span className="wizard-sets">{o.target / o.step} × {o.step}{o.unit === 'giây' ? ' giây' : ''}</span></li>)}
                  </ol>}
                </li>; })}
            </ul>
            <p className="wizard-note">{plan.description}</p>
            {old.habitIds.length > 0 && <label className="plan-replace"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)}/> <span>Thay giáo án đang dùng ({old.habitIds.length} buổi): lưu trữ giáo án cũ, biến mất từ ngày mai, lịch sử vẫn giữ.</span></label>}
          </>}
      </div>}

      <footer className="wizard-actions">
        {step === 1 && <button type="button" className="btn btn-primary wizard-cta" onClick={() => { setStep(2); setOpen(0); }}>Tiếp tục <ChevronRight size={18} aria-hidden="true"/></button>}
        {step === 2 && <button type="button" className="btn btn-primary wizard-cta" disabled={saving || !plan} onClick={start}><Dumbbell size={18} aria-hidden="true"/> {saving ? 'Đang tạo…' : 'Bắt đầu hành trình'}</button>}
        {step > 1 && <div className="wizard-links"><button type="button" className="btn btn-quiet" onClick={() => setStep(1)}><ChevronLeft size={16} aria-hidden="true"/> Quay lại</button></div>}
      </footer>
    </section>
  </div>;
}
