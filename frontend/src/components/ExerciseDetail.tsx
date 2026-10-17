import { Dumbbell, Gauge, Layers } from 'lucide-react';
import { muscleLabel, type Exercise } from '../domain/exerciseLibrary';
import { infoFor, kindLabel, levelLabel } from '../domain/exerciseInfo';
import { Modal } from './Modal';
import { MuscleFigure } from './MuscleFigure';

/** One exercise in detail (B-37): muscles, equipment, level, kind, the plan numbers and technique cues. Read-only. */
export function ExerciseDetail({ exercise: e, onClose, action }: { exercise: Exercise; onClose: () => void; action?: React.ReactNode }) {
  const x = infoFor(e);
  const unit = e.unit === 'giây' ? 'giây' : 'rep';
  return <Modal title={e.name} onClose={onClose} sheet>
    <div className="xd">
      <div className="xd-top">
        <MuscleFigure primary={e.group} secondary={x.secondary}/>
        <dl className="xd-facts">
          <div><dt>Nhóm cơ chính</dt><dd>{muscleLabel[e.group]}</dd></div>
          <div><dt>Nhóm cơ phụ</dt><dd>{x.secondary.length ? x.secondary.map(g => muscleLabel[g]).join(', ') : 'Không đáng kể'}</dd></div>
          <div><dt>Giáo án gợi ý</dt><dd>{e.sets} set × {e.reps} {unit}{e.note ? ` ${e.note}` : ''}{e.restSeconds ? ` · nghỉ ${e.restSeconds} giây` : ''}</dd></div>
        </dl>
      </div>
      <p className="xd-chips"><span className="diff-chip"><Dumbbell size={13}/> {x.equipment}</span><span className="diff-chip"><Gauge size={13}/> Độ khó: {levelLabel[x.level]}</span><span className="diff-chip"><Layers size={13}/> {kindLabel[x.kind]}</span></p>
      <section aria-label="Hướng dẫn kỹ thuật"><h3 className="sheet-h">Kỹ thuật</h3>
        <ol className="xd-cues">{x.cues.map(c => <li key={c}>{c}</li>)}</ol></section>
      {action}
    </div>
  </Modal>;
}
