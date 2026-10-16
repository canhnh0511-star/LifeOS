// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { HabitDto, ObjectiveInput } from '../api/types';
import { EditHabitForm, HabitForm } from './forms';
import { ObjectivesEditor, normalizeObjectives, objectiveProblem, objectivesValid } from './ObjectivesEditor';

afterEach(cleanup);

function Harness({ start = [] as ObjectiveInput[], onChange = () => {} }: { start?: ObjectiveInput[]; onChange?: (v: ObjectiveInput[]) => void }) {
  const [value, setValue] = useState(start);
  return <ObjectivesEditor value={value} onChange={v => { setValue(v); onChange(v); }}/>;
}

describe('objective rules', () => {
  it('mirror the API limits', () => {
    expect(objectiveProblem({ title: 'Squat', target: 40, unit: 'rep', step: 5 })).toBeNull();
    expect(objectiveProblem({ title: ' ', target: 5 })).toMatch(/Tên/);
    expect(objectiveProblem({ title: 'x', target: 0 })).toMatch(/Mục tiêu/);
    expect(objectiveProblem({ title: 'x', target: 10001 })).toMatch(/Mục tiêu/);
    expect(objectiveProblem({ title: 'x', target: 5, step: 6 })).toMatch(/Bước/);
    expect(objectiveProblem({ title: 'x', target: 5, unit: 'u'.repeat(21) })).toMatch(/Đơn vị/);
    expect(objectivesValid(Array(21).fill({ title: 'x', target: 1 }))).toBe(false);
    expect(normalizeObjectives([{ title: '  Squat ', target: 40 }])).toEqual([{ title: 'Squat', target: 40, unit: '', step: 1 }]);
  });
});

describe('ObjectivesEditor', () => {
  it('adds, edits and removes lines', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange}/>);
    await userEvent.click(screen.getByRole('button', { name: /Thêm việc/ }));
    await userEvent.type(screen.getByLabelText('Tên việc 1'), 'Squat');
    const target = screen.getByLabelText('Mục tiêu việc 1'); await userEvent.clear(target); await userEvent.type(target, '40');
    await userEvent.type(screen.getByLabelText('Đơn vị việc 1'), 'rep');
    expect(onChange).toHaveBeenLastCalledWith([{ title: 'Squat', target: 40, unit: 'rep', step: 1 }]);
    await userEvent.click(screen.getByRole('button', { name: /Thêm việc/ }));
    expect(screen.getByLabelText('Tên việc 2')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Xoá việc 1' }));
    expect(onChange).toHaveBeenLastCalledWith([{ title: '', target: 10, unit: '', step: 1 }]);
  });
  it('explains a problem next to the line, and stops adding past 20 lines', async () => {
    render(<Harness start={[{ title: 'x', target: 5, step: 9 }]}/>);
    expect(screen.getByRole('alert').textContent).toMatch(/Bước/);
    cleanup();
    render(<Harness start={Array.from({ length: 20 }, (_, i) => ({ title: `v${i}`, target: 1 }))}/>);
    expect((screen.getByRole('button', { name: /Thêm việc/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('forms with a checklist', () => {
  const habit: HabitDto = { id: 'h1', goalId: 'g1', title: 'Gym', targetMinutes: 60, xpReward: 50, weekdays: [1, 3, 5], startDate: '2026-10-01', endDate: null, status: 'ACTIVE',
    objectives: [{ id: 'o1', title: 'Squat', target: 40, unit: 'rep', step: 5 }] };
  const goals = [{ id: 'g1', title: 'Khoẻ', category: 'HEALTH' as const, description: '', status: 'ACTIVE' as const, createdAt: '2026-10-01T00:00:00Z' }];

  it('creating a habit sends the checklist, and nothing when there is none', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HabitForm goals={goals} onClose={() => {}} onSave={onSave}/>);
    await userEvent.type(screen.getByPlaceholderText(/Luyện piano/), 'Tập chân');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo thói quen' }));
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('objectives');
    cleanup();
    render(<HabitForm goals={goals} onClose={() => {}} onSave={onSave}/>);
    await userEvent.type(screen.getByPlaceholderText(/Luyện piano/), 'Tập chân');
    await userEvent.click(screen.getByRole('button', { name: /Thêm việc/ }));
    await userEvent.type(screen.getByLabelText('Tên việc 1'), 'Squat');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo thói quen' }));
    expect(onSave.mock.calls[1][0].objectives).toEqual([{ title: 'Squat', target: 10, unit: '', step: 1 }]);
  });
  it('the create button stays off while a line is invalid', async () => {
    render(<HabitForm goals={goals} onClose={() => {}} onSave={vi.fn()}/>);
    await userEvent.type(screen.getByPlaceholderText(/Luyện piano/), 'Tập chân');
    await userEvent.click(screen.getByRole('button', { name: /Thêm việc/ }));   // an empty title is invalid
    expect((screen.getByRole('button', { name: 'Tạo thói quen' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('editing sends objectives only when they changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditHabitForm habit={habit} onClose={() => {}} onSave={onSave}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onSave).not.toHaveBeenCalled();                              // nothing changed
    const target = screen.getByLabelText('Mục tiêu việc 1'); await userEvent.clear(target); await userEvent.type(target, '50');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onSave).toHaveBeenCalledWith({ objectives: [{ title: 'Squat', target: 50, unit: 'rep', step: 5 }] });
  });
  it('removing every line sends an empty list (back to a plain tick)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditHabitForm habit={habit} onClose={() => {}} onSave={onSave}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Xoá việc 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onSave).toHaveBeenCalledWith({ objectives: [] });
  });
});
