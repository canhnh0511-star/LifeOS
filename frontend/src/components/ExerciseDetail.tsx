import { ChevronUp, Dumbbell, Gauge, Layers } from 'lucide-react';
import { muscleLabel, type Exercise } from '../domain/exerciseLibrary';
import { infoFor, kindLabel, levelLabel } from '../domain/exerciseInfo';
import { guideFor } from '../domain/exerciseGuide';
import { exerciseImage } from '../domain/exerciseImage';
import { MuscleFigure } from './MuscleFigure';

/** One exercise in detail, shown in place (no popup, no separate screen): muscles, equipment, level, the guide, the plan numbers. `onClose` collapses it. */
export function ExerciseDetail({ exercise: e, onClose, action }: { exercise: Exercise; onClose: () => void; action?: React.ReactNode }) {
  const x = infoFor(e);
  const guide = guideFor(e.id);
  const pic = exerciseImage(e.id);
  const unit = e.unit === 'giây' ? 'giây' : 'rep';
  return <div className="xd xd-inline" role="region" aria-label={`Chi tiết ${e.nameVi ?? e.name}`}>
      <div className="xd-top">
        <MuscleFigure primary={e.group} secondary={x.secondary}/>
        <dl className="xd-facts">
          <div><dt>Nhóm cơ chính</dt><dd>{muscleLabel[e.group]}</dd></div>
          <div><dt>Nhóm cơ phụ</dt><dd>{x.secondary.length ? x.secondary.map(g => muscleLabel[g]).join(', ') : 'Không đáng kể'}</dd></div>
          <div><dt>Giáo án gợi ý</dt><dd>{e.sets} set × {e.reps} {unit}{e.note ? ` ${e.note}` : ''}{e.restSeconds ? ` · nghỉ ${e.restSeconds} giây` : ''}</dd></div>
        </dl>
      </div>
      <p className="xd-chips"><span className="diff-chip"><Dumbbell size={13}/> {x.equipment}</span><span className="diff-chip"><Gauge size={13}/> Độ khó: {levelLabel[x.level]}</span><span className="diff-chip"><Layers size={13}/> {kindLabel[x.kind]}</span></p>
      {pic
        ? <figure className="xd-pic"><img src={pic} alt={`Ảnh hướng dẫn ${e.nameVi ?? e.name}: tư thế bắt đầu (trái) và tư thế kết thúc (phải)`} loading="lazy" width={640} height={640}/></figure>
        : <p className="xd-nopic" role="note">Chưa có ảnh động tác cho bài này (đang chuẩn bị). Hãy đọc kỹ các bước bên dưới hoặc nhờ huấn luyện viên chỉ.</p>}
      {guide ? <>
        <section aria-label="Chuẩn bị"><h3 className="sheet-h">Chuẩn bị</h3><ul className="xd-list">{guide.setup.map(t => <li key={t}>{t}</li>)}</ul></section>
        <section aria-label="Cách tập"><h3 className="sheet-h">Cách tập</h3><ol className="xd-cues">{guide.steps.map(t => <li key={t}>{t}</li>)}</ol></section>
        <section aria-label="Hít thở"><h3 className="sheet-h">Hít thở</h3><p className="xd-text">{guide.breathing}</p></section>
        <section aria-label="Lỗi thường gặp"><h3 className="sheet-h">Lỗi thường gặp</h3><ul className="xd-list">{guide.mistakes.map(t => <li key={t}>{t}</li>)}</ul></section>
      </> : <section aria-label="Hướng dẫn kỹ thuật"><h3 className="sheet-h">Kỹ thuật</h3>
        <ol className="xd-cues">{x.cues.map(c => <li key={c}>{c}</li>)}</ol>
        <p className="form-note">Hướng dẫn chi tiết cho bài này đang được biên soạn.</p></section>}
      <p className="form-note xd-safety">Đau nhói, tê hoặc chóng mặt: dừng bài và hỏi huấn luyện viên. Đây là hướng dẫn cho người mới, không thay thế tư vấn y tế.</p>
      {action}
      <button type="button" className="btn btn-quiet xd-collapse" onClick={onClose}><ChevronUp size={16}/> Thu gọn</button>
  </div>;
}
