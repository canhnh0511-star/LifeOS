import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import type { Exercise } from '../domain/exerciseLibrary';
import { infoFor } from '../domain/exerciseInfo';
import { exerciseCrop, exerciseImage } from '../domain/exerciseImage';

const label = (e: Exercise) => e.nameVi ?? e.name;

/**
 * The instruction picture of an exercise (start pose left, end pose right) with its labels. When there is no picture, or it fails to load,
 * a placeholder names the equipment instead; it never shows a wrong picture. `compact` shortens the placeholder for the workout screen.
 */
export function ExercisePicture({ exercise: e, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const src = exerciseImage(e.id);
  const [failed, setFailed] = useState<string | null>(null);
  const equipment = infoFor(e).equipment;
  if (!src || failed === src) {
    return <div className={`xd-nopic ${compact ? 'is-compact' : ''}`} role="note"><Dumbbell size={compact ? 20 : 28} aria-hidden="true"/>
      <span><strong>{equipment}</strong>{compact ? 'Chưa có ảnh' : 'Chưa có ảnh động tác cho bài này (đang chuẩn bị). Hãy đọc kỹ các bước bên dưới hoặc nhờ huấn luyện viên chỉ.'}</span></div>;
  }
  return <figure className="xd-pic">
    <img src={src} alt={`Ảnh hướng dẫn ${label(e)}: tư thế bắt đầu (trái) và tư thế kết thúc (phải)`} loading="lazy" width={640} style={exerciseCrop(e.id)} onError={() => setFailed(src)}/>
    <figcaption aria-hidden="true"><span>Bắt đầu</span><span>Kết thúc</span></figcaption>
  </figure>;
}

/** A small 3:2 version of the picture (the same crop as the detail, both poses) for lists; falls back to the equipment icon. Decorative: the name next to it already says what it is. */
export function ExerciseThumb({ exercise: e, size = 52 }: { exercise: Exercise; size?: number }) {
  const src = exerciseImage(e.id);
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="xt" style={{ width: Math.round(size * 1.5), height: size }} aria-hidden="true">
    {src && failed !== src ? <img src={src} alt="" loading="lazy" width={Math.round(size * 1.5)} height={size} style={{ objectPosition: exerciseCrop(e.id).objectPosition }} onError={() => setFailed(src)}/> : <Dumbbell size={Math.round(size / 2.2)}/>}
  </span>;
}
