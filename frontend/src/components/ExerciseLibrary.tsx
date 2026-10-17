import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EXERCISES, muscleLabel, type Exercise, type MuscleGroup } from '../domain/exerciseLibrary';
import { infoFor, levelLabel } from '../domain/exerciseInfo';
import { Modal } from './Modal';
import { ExerciseDetail } from './ExerciseDetail';
import { MuscleFigure } from './MuscleFigure';

const GROUPS = Object.keys(muscleLabel) as MuscleGroup[];
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
/** Filter by muscle group (null = all) and by a search text that ignores case and Vietnamese accents; matches the name, group and equipment. */
export function filterExercises(list: readonly Exercise[], group: MuscleGroup | null, query: string): Exercise[] {
  const q = plain(query.trim());
  return list.filter(e => (!group || e.group === group) && (!q || plain(`${e.name} ${muscleLabel[e.group]} ${infoFor(e).equipment}`).includes(q)));
}

/** The exercise library (B-39): search, filter by muscle group, open an exercise for its detail. */
export function ExerciseLibrary({ onClose }: { onClose: () => void }) {
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Exercise | null>(null);
  const shown = useMemo(() => filterExercises(EXERCISES, group, query), [group, query]);
  if (open) return <ExerciseDetail exercise={open} onClose={() => setOpen(null)}/>;
  return <Modal title="Thư viện bài tập" onClose={onClose} sheet>
    <div className="xl">
      <label className="xl-search"><Search size={16}/><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm bài tập, nhóm cơ, dụng cụ" aria-label="Tìm bài tập"/></label>
      <div className="xl-groups" role="group" aria-label="Lọc theo nhóm cơ">
        <button type="button" className={`xl-chip${group === null ? ' is-on' : ''}`} aria-pressed={group === null} onClick={() => setGroup(null)}>Tất cả <b>{EXERCISES.length}</b></button>
        {GROUPS.map(g => <button type="button" key={g} className={`xl-chip${group === g ? ' is-on' : ''}`} aria-pressed={group === g} onClick={() => setGroup(group === g ? null : g)}>{muscleLabel[g]} <b>{EXERCISES.filter(e => e.group === g).length}</b></button>)}
      </div>
      <p className="form-note" role="status">{shown.length} bài</p>
      {shown.length === 0 ? <p className="xl-empty">Không có bài nào khớp. Thử bỏ bớt từ khoá hoặc chọn nhóm cơ khác.</p>
        : <ul className="xl-list">{shown.map(e => <li key={e.id}><button type="button" className="xl-item" onClick={() => setOpen(e)} aria-label={`Chi tiết ${e.name}`}>
          <MuscleFigure primary={e.group} size={28}/><span><strong>{e.name}</strong><small>{muscleLabel[e.group]} · {infoFor(e).equipment} · {levelLabel[infoFor(e).level]}</small></span><small className="xl-plan">{e.sets}×{e.reps}</small>
        </button></li>)}</ul>}
    </div>
  </Modal>;
}
