// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanImportForm } from './PlanImportForm';
import { PROGRAMS, planRequest } from '../domain/exerciseLibrary';
import { mockClient } from '../api/mockClient';

afterEach(() => { cleanup(); localStorage.clear(); });

describe('PlanImportForm (B-32)', () => {
  it('shows what the program creates and sends nothing until the confirm button', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<PlanImportForm onClose={() => {}} onImport={onImport}/>);
    const preview = screen.getByLabelText('Xem trước giáo án');
    expect(preview.textContent).toContain('Đẩy ngực với máy · 2×10');
    expect(preview.textContent).toContain('Con bọ chết (Dead Bug) · 2×8 mỗi bên');
    expect(preview.textContent).toContain('5 thói quen');
    await userEvent.click(screen.getByRole('radio', { name: /Chia nhóm cơ — 5 buổi/ }));
    expect(preview.textContent).toContain('5 thói quen');
    expect(preview.textContent).toContain('Plank (giữ thân thẳng) · 3×45 giây');
    expect(onImport).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Nạp giáo án/ }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0]).toMatchObject({ goals: [{ title: 'Gym — Chia nhóm cơ — 5 buổi', category: 'HEALTH' }] });
  });
  it('cancel closes without importing', async () => {
    const onImport = vi.fn(), onClose = vi.fn();
    render(<PlanImportForm onClose={onClose} onImport={onImport}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });
});

describe.each(PROGRAMS)('importing $name into the mock API', program => {
  it('is accepted, creates scheduled habits with set-sized checklists, and refuses a second import', async () => {
    localStorage.clear();
    const start = '2026-10-19';
    const out = await mockClient.importHabitPlan(planRequest(program, start));
    expect(out.habits).toHaveLength(program.days.length);
    expect(out.habits[0].objectives[0]).toEqual(expect.objectContaining({ title: expect.any(String), step: expect.any(Number) }));
    await expect(mockClient.importHabitPlan(planRequest(program, start))).rejects.toMatchObject({ status: 409 });
  });
});

describe('PlanImportForm replacing an existing plan', () => {
  type H = import('../api/types').HabitDto; type G = import('../api/types').GoalDto;
  const habit = (id: string, title: string, goalId = 'g1', status = 'ACTIVE') => ({ id, goalId, title, targetMinutes: 45, xpReward: 40, weekdays: [1], startDate: '2026-10-12', endDate: null, status, objectives: [] }) as unknown as H;
  const goal = (id: string, title: string, status = 'ACTIVE') => ({ id, title, status, category: 'HEALTH', description: '' }) as unknown as G;
  const planGoal = 'Gym — Tuần 1 — quay lại tập (45 phút)';
  it('archives the old goal and its sessions (on by default) and passes their ids with the import', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<PlanImportForm onClose={() => {}} onImport={onImport} existingGoals={[goal('g1', planGoal), goal('g2', 'Đạm')]} existingHabits={[habit('a', 'Buổi A — Ngực ưu tiên / Toàn thân'), habit('x', 'Uống nước', 'g2'), habit('z', 'Buổi B — Chân, lưng, vai', 'g1', 'ARCHIVED')]}/>);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/Đã có giáo án này \(1 buổi/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Nạp giáo án/ }));
    expect(onImport.mock.calls[0][1]).toEqual({ goalIds: ['g1'], habitIds: ['a'] });
  });
  it('replaces nothing when unchecked, and shows nothing when there is no old plan', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<PlanImportForm onClose={() => {}} onImport={onImport} existingGoals={[goal('g1', planGoal)]} existingHabits={[habit('a', 'Buổi A — Ngực ưu tiên / Toàn thân')]}/>);
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Nạp giáo án/ }));
    expect(onImport.mock.calls[0][1]).toEqual({ goalIds: [], habitIds: [] });
    cleanup();
    render(<PlanImportForm onClose={() => {}} onImport={onImport} existingGoals={[goal('g2', 'Đạm')]} existingHabits={[habit('x', 'Uống nước', 'g2')]}/>);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
