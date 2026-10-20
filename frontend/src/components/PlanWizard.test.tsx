// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GoalDto, HabitDto } from '../api/types';
import { standardPlanTemplate } from '../domain/standardPlan';
import { viName } from '../domain/exerciseLibrary';
import { PlanWizard } from './PlanWizard';

afterEach(cleanup);

const goal = (id: string): GoalDto => ({ id, title: 'Gym — Tuần 1', category: 'HEALTH', description: '', status: 'ACTIVE', createdAt: '2026-10-01T00:00:00Z' });
const gymHabit = (id: string, goalId: string): HabitDto => ({ id, goalId, title: `Buổi ${id}`, targetMinutes: 45, xpReward: 40, weekdays: [1], startDate: '2026-10-01', endDate: null, status: 'ACTIVE', objectives: [{ id: id + 'o', title: 'Leg Press', target: 20, unit: 'rep', step: 10 }] });
function setup(props: Partial<Parameters<typeof PlanWizard>[0]> = {}) {
  const onStart = vi.fn().mockResolvedValue(undefined), onClose = vi.fn(), loadPlan = vi.fn().mockResolvedValue(standardPlanTemplate());
  render(<PlanWizard displayName="Cảnh" goals={[]} habits={[]} loadPlan={loadPlan} onStart={onStart} onClose={onClose} {...props}/>);
  return { onStart, onClose, loadPlan, user: userEvent.setup() };
}

describe('PlanWizard: two steps from awakening to the plan', () => {
  it('starts with the story, greets the hunter by account name and marks step 1', () => {
    setup();
    expect(screen.getByText('Bạn là thợ săn hạng E.')).toBeTruthy();
    expect(screen.getByText(/Cảnh/)).toBeTruthy();
    expect(screen.getByRole('img', { name: /Hạng E/ })).toBeTruthy();
    const steps = screen.getByRole('list', { name: 'Các bước' });
    expect(within(steps).getByText('1 · Thức tỉnh').closest('li')!.getAttribute('aria-current')).toBe('step');
    expect(within(steps).getByText('2 · Giáo án')).toBeTruthy();
    expect(within(steps).queryByText(/Mục tiêu/)).toBeNull();      // no goal / place / frequency questions: there is one plan
  });

  it('shows the plan from the backend: sessions with days, muscle groups and the first session open', async () => {
    const { user, loadPlan } = setup();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(await screen.findByText('Giáo án của bạn')).toBeTruthy();
    expect(loadPlan).toHaveBeenCalled();
    expect(await screen.findByText('3 buổi/tuần: T2 · T4 · T6')).toBeTruthy();
    expect(screen.getByText('Ngày nhẹ: Đi bộ nhanh T3 · T7, Giãn cơ phục hồi T5; chủ nhật nghỉ')).toBeTruthy(); // ADR-045
    const first = screen.getByRole('button', { name: /Buổi A/ });
    expect(first.getAttribute('aria-expanded')).toBe('true');
    expect(first.textContent).toContain('Thứ Hai'); expect(first.textContent).toContain('6 bài');
    expect(screen.getByText(viName('Leg Press'))).toBeTruthy();
    expect(screen.getAllByText('3 × 12')).toHaveLength(2); expect(screen.getByText('3 × 30 giây')).toBeTruthy();   // Leg Press and Glute Bridge
    expect(screen.getByRole('button', { name: /Buổi B/ }).getAttribute('aria-expanded')).toBe('false');
    await user.click(screen.getByRole('button', { name: /Buổi B/ }));
    expect(screen.getByText(viName('Goblet Squat'))).toBeTruthy();
  });

  it('creates nothing until "Bắt đầu hành trình", then starts the plan once', async () => {
    const { user, onStart } = setup();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByText('3 buổi/tuần: T2 · T4 · T6');
    expect(onStart).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Bắt đầu hành trình' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({ goalIds: [], habitIds: [] });
  });

  it('offers to replace an older gym plan and passes what it replaces, or nothing when unticked', async () => {
    const { user, onStart } = setup({ goals: [goal('g')], habits: [gymHabit('a', 'g'), gymHabit('b', 'g')] });
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await screen.findByText('3 buổi/tuần: T2 · T4 · T6');
    const box = screen.getByRole('checkbox', { name: /Thay giáo án đang dùng \(2 buổi\)/ }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Bắt đầu hành trình' }));
    expect(onStart).toHaveBeenLastCalledWith({ goalIds: ['g'], habitIds: ['a', 'b'] });
    await user.click(box);
    await user.click(screen.getByRole('button', { name: 'Bắt đầu hành trình' }));
    expect(onStart).toHaveBeenLastCalledWith({ goalIds: [], habitIds: [] });
  });

  it('says so and lets you retry when the plan cannot be loaded', async () => {
    const loadPlan = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(standardPlanTemplate());
    const { user } = setup({ loadPlan });
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Không tải được giáo án');
    expect((screen.getByRole('button', { name: 'Bắt đầu hành trình' }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('3 buổi/tuần: T2 · T4 · T6')).toBeTruthy();
  });

  it('goes back to the story, and "Để sau" closes it', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('button', { name: /Quay lại/ }));
    expect(screen.getByText('Bạn là thợ săn hạng E.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Để sau' }));
    expect(onClose).toHaveBeenCalled();
  });
});
