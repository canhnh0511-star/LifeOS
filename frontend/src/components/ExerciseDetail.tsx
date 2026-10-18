import { useId, useState } from 'react';
import { ChevronUp, Dumbbell, Gauge, Layers } from 'lucide-react';
import { muscleLabel, type Exercise } from '../domain/exerciseLibrary';
import { infoFor, kindLabel, levelLabel } from '../domain/exerciseInfo';
import { guideFor } from '../domain/exerciseGuide';
import { ExercisePicture } from './ExercisePicture';
import { MuscleFigure } from './MuscleFigure';

type Tab = 'steps' | 'setup' | 'breathing' | 'mistakes';
const TABS: readonly { id: Tab; label: string }[] = [{ id: 'steps', label: 'Cách tập' }, { id: 'setup', label: 'Chuẩn bị' }, { id: 'breathing', label: 'Hít thở' }, { id: 'mistakes', label: 'Lỗi thường gặp' }];

/**
 * One exercise in detail, shown in place (no popup, no separate screen), laid out like a card: picture, name and chips, a small stats card
 * (muscles and the plan numbers), then the guide in tabs so a beginner reads one part at a time. `onClose` collapses it.
 */
export function ExerciseDetail({ exercise: e, onClose, action, showPicture = true }: { exercise: Exercise; onClose: () => void; action?: React.ReactNode; /** false where the screen already shows the picture */ showPicture?: boolean }) {
  const x = infoFor(e);
  const guide = guideFor(e.id);
  const unit = e.unit === 'giây' ? 'giây' : 'rep';
  const [tab, setTab] = useState<Tab>('steps');
  const id = useId();
  const tabKeys = (ev: React.KeyboardEvent, i: number) => {
    const to = ev.key === 'ArrowRight' ? (i + 1) % TABS.length : ev.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : -1;
    if (to < 0) return;
    ev.preventDefault(); setTab(TABS[to].id); document.getElementById(`${id}-t-${TABS[to].id}`)?.focus();
  };
  return <div className="xd xd-inline xd-card" role="region" aria-label={`Chi tiết ${e.nameVi ?? e.name}`}>
      {showPicture && <ExercisePicture exercise={e}/>}
      <header className="xd-head">
        <div><h3 className="xd-name">{e.nameVi ?? e.name}</h3>{e.nameVi && <small className="xd-name-en" lang="en">{e.name}</small>}</div>
        <p className="xd-chips"><span className="diff-chip xd-chip"><Dumbbell size={13}/> {x.equipment}</span><span className={`diff-chip xd-chip xd-level-${x.level.toLowerCase()}`}><Gauge size={13}/> Độ khó: {levelLabel[x.level]}</span><span className="diff-chip xd-chip"><Layers size={13}/> {kindLabel[x.kind]}</span></p>
      </header>
      <div className="xd-top xd-stats">
        <MuscleFigure primary={e.group} secondary={x.secondary}/>
        <dl className="xd-facts">
          <div><dt>Nhóm cơ chính</dt><dd>{muscleLabel[e.group]}</dd></div>
          <div><dt>Nhóm cơ phụ</dt><dd>{x.secondary.length ? x.secondary.map(g => muscleLabel[g]).join(', ') : 'Không đáng kể'}</dd></div>
          <div><dt>Giáo án gợi ý</dt><dd className="xd-plan">{e.sets} set × {e.reps} {unit}{e.note ? ` ${e.note}` : ''}{e.restSeconds ? ` · nghỉ ${e.restSeconds} giây` : ''}</dd></div>
        </dl>
      </div>
      {guide ? <section className="xd-guide" aria-label="Hướng dẫn">
        <div role="tablist" aria-label="Hướng dẫn tập" className="xd-tabs">
          {TABS.map((t, i) => <button key={t.id} type="button" role="tab" id={`${id}-t-${t.id}`} aria-selected={tab === t.id} aria-controls={`${id}-p`} tabIndex={tab === t.id ? 0 : -1}
            className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)} onKeyDown={ev => tabKeys(ev, i)}>{t.label}</button>)}
        </div>
        <div role="tabpanel" id={`${id}-p`} aria-labelledby={`${id}-t-${tab}`} className="xd-panel">
          <h3 className="sheet-h">{TABS.find(t => t.id === tab)!.label}</h3>
          {tab === 'steps' && <ol className="xd-cues">{guide.steps.map(t => <li key={t}>{t}</li>)}</ol>}
          {tab === 'setup' && <ul className="xd-list">{guide.setup.map(t => <li key={t}>{t}</li>)}</ul>}
          {tab === 'breathing' && <p className="xd-text">{guide.breathing}</p>}
          {tab === 'mistakes' && <ul className="xd-list">{guide.mistakes.map(t => <li key={t}>{t}</li>)}</ul>}
        </div>
      </section> : <section aria-label="Hướng dẫn kỹ thuật" className="xd-guide xd-panel"><h3 className="sheet-h">Kỹ thuật</h3>
        <ol className="xd-cues">{x.cues.map(c => <li key={c}>{c}</li>)}</ol>
        <p className="form-note">Hướng dẫn chi tiết cho bài này đang được biên soạn.</p></section>}
      <p className="form-note xd-safety">Đau nhói, tê hoặc chóng mặt: dừng bài và hỏi huấn luyện viên. Đây là hướng dẫn cho người mới, không thay thế tư vấn y tế.</p>
      {action}
      <button type="button" className="btn btn-quiet xd-collapse" onClick={onClose}><ChevronUp size={16}/> Thu gọn</button>
  </div>;
}
