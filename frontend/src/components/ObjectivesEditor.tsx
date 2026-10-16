import { Plus, X } from 'lucide-react';
import type { ObjectiveInput } from '../api/types';

export const MAX_OBJECTIVES = 20;
/** Same limits as the API: title 1-100, target 1-10000, unit up to 20, step 1..target. */
export function objectiveProblem(o: ObjectiveInput): string | null {
  if (!o.title.trim()) return 'Tên việc không được để trống.';
  if (o.title.trim().length > 100) return 'Tên việc tối đa 100 ký tự.';
  if (!Number.isInteger(o.target) || o.target < 1 || o.target > 10000) return 'Mục tiêu phải là số nguyên từ 1 đến 10000.';
  if ((o.unit ?? '').trim().length > 20) return 'Đơn vị tối đa 20 ký tự.';
  const step = o.step ?? 1;
  if (!Number.isInteger(step) || step < 1 || step > o.target) return 'Bước phải từ 1 đến mục tiêu.';
  return null;
}
export const objectivesValid = (list: readonly ObjectiveInput[]) => list.length <= MAX_OBJECTIVES && list.every(o => objectiveProblem(o) === null);
/** What is sent to the API: trimmed, with default step and no empty unit left implicit. */
export const normalizeObjectives = (list: readonly ObjectiveInput[]): Required<ObjectiveInput>[] => list.map(o => ({ title: o.title.trim(), target: o.target, unit: (o.unit ?? '').trim(), step: o.step ?? 1 }));

const UNITS = ['rep', 'bài', 'cốc', 'ml', 'phút', 'bước', 'trang', 'lần', 'km'];

/**
 * Editor for a habit's checklist ("Squat · 40 · rep"). A line with target 1 and no unit is a plain tick.
 * Nothing here is sent until the surrounding form is saved.
 */
export function ObjectivesEditor({ value, onChange }: { value: ObjectiveInput[]; onChange: (next: ObjectiveInput[]) => void }) {
  const update = (i: number, patch: Partial<ObjectiveInput>) => onChange(value.map((o, j) => j === i ? { ...o, ...patch } : o));
  return <fieldset className="objectives-editor">
    <legend>Danh sách việc cần làm <span className="subtle-text">(không bắt buộc)</span></legend>
    <p className="form-note">Chia nhiệm vụ thành các việc có số lượng, ví dụ “Squat · 40 · rep” hay “Nước · 10 · cốc”. Nhiệm vụ xong khi mọi việc đạt mục tiêu. Mục tiêu 1 và không có đơn vị là ô tick.</p>
    <datalist id="objective-units">{UNITS.map(u => <option key={u} value={u}/>)}</datalist>
    {value.length > 0 && <div className="objective-edit-row objective-edit-head" aria-hidden="true"><span>Tên việc</span><span>Mục tiêu</span><span>Đơn vị</span><span title="Mỗi lần bấm + hoặc − thay đổi bao nhiêu">Bước</span><span/></div>}
    {value.map((o, i) => {
      const problem = objectiveProblem(o);
      return <div className="objective-edit-row" key={i}>
        <input aria-label={`Tên việc ${i + 1}`} placeholder="Tên việc" value={o.title} maxLength={100} onChange={e => update(i, { title: e.target.value })}/>
        <input aria-label={`Mục tiêu việc ${i + 1}`} type="number" min={1} max={10000} value={Number.isNaN(o.target) ? '' : o.target} onChange={e => update(i, { target: e.target.value === '' ? NaN : Number(e.target.value) })}/>
        <input aria-label={`Đơn vị việc ${i + 1}`} placeholder="đơn vị" list="objective-units" maxLength={20} value={o.unit ?? ''} onChange={e => update(i, { unit: e.target.value })}/>
        <input aria-label={`Bước nhanh việc ${i + 1}`} title="Mỗi lần bấm + hoặc − thay đổi bao nhiêu" type="number" min={1} max={10000} value={o.step ?? 1} onChange={e => update(i, { step: e.target.value === '' ? NaN : Number(e.target.value) })}/>
        <button type="button" className="icon-btn" aria-label={`Xoá việc ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X size={16}/></button>
        {problem && o.title.trim() !== '' && <small className="objective-edit-problem" role="alert">{problem}</small>}
      </div>;
    })}
    <button type="button" className="btn btn-quiet" disabled={value.length >= MAX_OBJECTIVES} onClick={() => onChange([...value, { title: '', target: 10, unit: '', step: 1 }])}><Plus size={15}/> Thêm việc</button>
  </fieldset>;
}
