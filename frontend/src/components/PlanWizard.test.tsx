// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GoalDto, HabitDto } from '../api/types';
import { PlanWizard } from './PlanWizard';

afterEach(cleanup);

const goal = (id: string): GoalDto => ({ id, title: 'Gym — Tuần 1', category: 'HEALTH', description: '', status: 'ACTIVE', createdAt: '2026-10-01T00:00:00Z' });
const gymHabit = (id: string, goalId: string): HabitDto => ({ id, goalId, title: `Buổi ${id}`, targetMinutes: 45, xpReward: 40, weekdays: [1], startDate: '2026-10-01', endDate: null, status: 'ACTIVE', objectives: [{ id: 'o', title: 'Leg Press', target: 20, unit: 'rep', step: 10 }] });
function setup(props: Partial<Parameters<typeof PlanWizard>[0]> = {}) {
  const onImport = vi.fn().mockResolvedValue(undefined), onClose = vi.fn(), onChooseProgram = vi.fn();
  render(<PlanWizard displayName="Cảnh" goals={[]} habits={[]} onImport={onImport} onClose={onClose} onChooseProgram={onChooseProgram} {...props}/>);
  return { onImport, onClose, onChooseProgram, user: userEvent.setup() };
}

describe('PlanWizard: three steps from awakening to a plan', () => {
  it('starts with the story, greets the hunter by account name and marks step 1', () => {
    setup();
    expect(screen.getByText('Bạn là thợ săn hạng E.')).toBeTruthy();
    expect(screen.getByText(/Cảnh/)).toBeTruthy();
    expect(screen.getByRole('img', { name: /Hạng E/ })).toBeTruthy();
    const steps = screen.getByRole('list', { name: 'Các bước' });
    expect(within(steps).getByText('1 · Thức tỉnh').closest('li')!.getAttribute('aria-current')).toBe('step');
    expect(within(steps).getByText('2 · Mục tiêu')).toBeTruthy(); expect(within(steps).getByText('3 · Giáo án')).toBeTruthy();
  });

  it('step 2 asks goal, place and frequency, each saying what it changes, with sensible defaults', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(screen.getByText('Lựa chọn này quyết định bài tập, số rep và thời gian nghỉ trong giáo án.')).toBeTruthy();
    const goals = screen.getByRole('radiogroup', { name: 'Mục tiêu của bạn' });
    expect((within(goals).getByRole('radio', { name: /Tăng cơ/ }) as HTMLInputElement).checked).toBe(true);
    expect(within(goals).getByText('8–12 rep')).toBeTruthy(); expect(within(goals).getByText('Nghỉ 30–45 giây')).toBeTruthy(); expect(within(goals).getByText('Nghỉ 2–3 phút')).toBeTruthy();
    const places = screen.getByRole('radiogroup', { name: 'Bạn tập ở đâu?' });
    expect((within(places).getByRole('radio', { name: /Phòng gym đủ máy/ }) as HTMLInputElement).checked).toBe(true);
    expect(within(places).getByRole('radio', { name: /Chỉ có tạ đơn/ })).toBeTruthy(); expect(within(places).getByRole('radio', { name: /Tại nhà/ })).toBeTruthy();
    const sessions = screen.getByRole('radiogroup', { name: 'Số buổi mỗi tuần' });
    expect((within(sessions).getByRole('radio', { name: '3' }) as HTMLInputElement).checked).toBe(true);
    expect(within(sessions).getAllByRole('radio').map(r => (r as HTMLInputElement).value)).toEqual(['2', '3', '4', '5']);
  });

  it('step 3 shows the plan for the answers, one session open at a time, then imports it with the goal in the title', async () => {
    const { user, onImport } = setup();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('radio', { name: /Giảm mỡ/ })); await user.click(screen.getByRole('radio', { name: /Tại nhà/ })); await user.click(screen.getByRole('radio', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'Tạo giáo án' }));
    expect(screen.getByRole('heading', { name: 'Giáo án của bạn' })).toBeTruthy();
    expect(screen.getByText('Giảm mỡ')).toBeTruthy(); expect(screen.getByText('Tại nhà')).toBeTruthy(); expect(screen.getByText(/4 buổi\/tuần: T2 · T3 · T5 · T7/)).toBeTruthy();
    const sessions = screen.getAllByRole('button', { name: /^Buổi [A-E] —/ });
    expect(sessions).toHaveLength(4);
    expect(sessions[0].getAttribute('aria-expanded')).toBe('true'); expect(sessions[1].getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Squat không tạ')).toBeTruthy();
    await user.click(sessions[1]);
    expect(sessions[0].getAttribute('aria-expanded')).toBe('false'); expect(sessions[1].getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Đổi bài, đổi ngày hoặc số buổi bất cứ lúc nào.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Bắt đầu hành trình' }));
    expect(onImport).toHaveBeenCalledTimes(1);
    const [request, replace] = onImport.mock.calls[0];
    expect(request.goals[0].title).toBe('Gym — Giảm mỡ · Tại nhà · 4 buổi/tuần');
    expect(request.goals[0].habits).toHaveLength(4);
    expect(replace).toEqual({ goalIds: [], habitIds: [] });
  });

  it('keeps the answers when going back, and "Quay lại" returns one step', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.click(screen.getByRole('radio', { name: /Khỏe hơn/ }));
    await user.click(screen.getByRole('button', { name: 'Tạo giáo án' }));
    await user.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect((screen.getByRole('radio', { name: /Khỏe hơn/ }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(screen.getByText('Bạn là thợ săn hạng E.')).toBeTruthy();
  });

  it('offers to replace the plan in use (checked by default), and sends nothing to archive when unchecked', async () => {
    const { user, onImport } = setup({ goals: [goal('g1')], habits: [gymHabit('a', 'g1'), gymHabit('b', 'g1')] });
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' })); await user.click(screen.getByRole('button', { name: 'Tạo giáo án' }));
    const box = screen.getByRole('checkbox', { name: /Thay giáo án đang dùng/ }) as HTMLInputElement;
    expect(box.checked).toBe(true); expect(box.parentElement!.textContent).toContain('2 buổi');
    await user.click(screen.getByRole('button', { name: 'Bắt đầu hành trình' }));
    expect(onImport.mock.calls[0][1]).toEqual({ goalIds: ['g1'], habitIds: ['a', 'b'] });
    onImport.mockClear();
    await user.click(box);
    await user.click(screen.getByRole('button', { name: 'Bắt đầu hành trình' }));
    expect(onImport.mock.calls[0][1]).toEqual({ goalIds: [], habitIds: [] });
  });

  it('can be left for later, closes on Escape, and can switch to the ready-made programs', async () => {
    const { user, onClose, onChooseProgram } = setup();
    await user.click(screen.getByRole('button', { name: 'Để sau' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Chọn giáo án có sẵn' }));
    expect(onChooseProgram).toHaveBeenCalledTimes(1);
  });

  it('does not double-submit while importing', async () => {
    let finish: () => void = () => {};
    const onImport = vi.fn(() => new Promise<void>(r => { finish = r; }));
    const { user } = setup({ onImport });
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' })); await user.click(screen.getByRole('button', { name: 'Tạo giáo án' }));
    await user.click(screen.getByRole('button', { name: 'Bắt đầu hành trình' }));
    expect((screen.getByRole('button', { name: /Đang tạo/ }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: /Đang tạo/ }));
    expect(onImport).toHaveBeenCalledTimes(1);
    finish();
  });
});
