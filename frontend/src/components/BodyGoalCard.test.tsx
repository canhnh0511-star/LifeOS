// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BodyGoalDto, MetricDto } from '../api/types';
import { BodyGoalCard } from './BodyGoalCard';

afterEach(cleanup);
const goal: BodyGoalDto = { heightCm: 166, startWeightKg: 86, targetWeightKg: 78.5, startDate: '2026-10-19', days: 100 };
const metrics = (...e: [string, number][]): MetricDto[] => [{ id: 'w', name: 'Cân nặng', unit: 'kg', builtin: true, entries: e.map(([date, value]) => ({ date, value })) }];
const setup = (g: BodyGoalDto | null, m: MetricDto[], today = '2026-11-18') => {
  const onSave = vi.fn().mockResolvedValue(true);
  render(<BodyGoalCard goal={g} metrics={m} today={today} busy={false} onSave={onSave}/>);
  return { onSave, user: userEvent.setup() };
};

describe('body goal card', () => {
  it('without a goal it asks for height, weight now (filled from the latest weight), target and days (100)', () => {
    setup(null, metrics(['2026-11-17', 86]));
    const form = screen.getByRole('form', { name: 'Đặt mục tiêu cơ thể' });
    expect((within(form).getByLabelText('Cân nặng hiện tại (kg)') as HTMLInputElement).value).toBe('86');
    expect((within(form).getByLabelText('Số ngày') as HTMLInputElement).value).toBe('100');
    expect((within(form).getByLabelText('Chiều cao (cm)') as HTMLInputElement).value).toBe('');
  });
  it('saves the goal starting today, with commas accepted, and shows the target BMI while typing', async () => {
    const { user, onSave } = setup(null, []);
    await user.type(screen.getByLabelText('Chiều cao (cm)'), '166'); await user.type(screen.getByLabelText('Cân nặng hiện tại (kg)'), '86'); await user.type(screen.getByLabelText('Cân nặng mục tiêu (kg)'), '78,5');
    expect(screen.getByRole('status').textContent).toContain('BMI mục tiêu 28,5 (Thừa cân)');
    await user.click(screen.getByRole('button', { name: 'Đặt mục tiêu' }));
    expect(onSave).toHaveBeenCalledWith({ heightCm: 166, startWeightKg: 86, targetWeightKg: 78.5, days: 100, startDate: '2026-11-18' });
  });
  it('explains each wrong field and saves nothing', async () => {
    const { user, onSave } = setup(null, []);
    await user.type(screen.getByLabelText('Chiều cao (cm)'), '90'); await user.type(screen.getByLabelText('Cân nặng hiện tại (kg)'), '86'); await user.type(screen.getByLabelText('Cân nặng mục tiêu (kg)'), '86');
    await user.click(screen.getByRole('button', { name: 'Đặt mục tiêu' }));
    expect(screen.getAllByRole('alert').map(a => a.textContent)).toEqual(['Chiều cao từ 100 đến 250 cm.', 'Mục tiêu phải khác cân nặng hiện tại.']);
    expect(onSave).not.toHaveBeenCalled();
  });
  it('with a goal it shows the day, the way covered, today\'s steady weight, the pace and BMI', () => {
    setup(goal, metrics(['2026-10-19', 86], ['2026-11-18', 83.5]));
    const card = screen.getByRole('region', { name: 'Mục tiêu cơ thể' });
    expect(card.textContent).toContain('Ngày 31/100'); expect(card.textContent).toContain('còn 69 ngày');
    expect(within(card).getByText('Hiện tại').nextSibling!.textContent).toBe('83,5 kg');
    expect(within(card).getByText('Đã thay đổi').nextSibling!.textContent).toBe('-2,5 kg');
    expect(within(card).getByText('Còn lại').nextSibling!.textContent).toBe('5 kg');
    expect(within(card).getByText('Theo kế hoạch hôm nay').nextSibling!.textContent).toBe('83,8 kg');
    expect(within(card).getByRole('status').textContent).toContain('Đúng tiến độ');
    expect(card.textContent).toContain('BMI 30,3 (Béo phì) → mục tiêu 28,5 (Thừa cân)');
    expect(card.textContent).toContain('không cộng XP');
  });
  it('tells you to log a weight when there is none since the start', () => {
    setup(goal, metrics(['2026-10-01', 90]));
    expect(screen.getByRole('status').textContent).toContain('Chưa có cân nặng mới');
    expect(screen.getByText(/Ghi cân nặng ở thẻ/)).toBeTruthy();
  });
  it('warns when the target is too aggressive', () => {
    setup({ ...goal, targetWeightKg: 50 }, []);
    const alerts = screen.getAllByRole('alert').map(a => a.textContent).join(' ');
    expect(alerts).toMatch(/thiếu cân/); expect(alerts).toMatch(/khá nhanh/);
  });
  it('edits the goal in place, keeps the start date unless asked to restart, and can be cancelled', async () => {
    const { user, onSave } = setup(goal, metrics(['2026-11-18', 83.5]));
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa mục tiêu' }));
    expect((screen.getByLabelText('Cân nặng mục tiêu (kg)') as HTMLInputElement).value).toBe('78,5');
    await user.clear(screen.getByLabelText('Cân nặng mục tiêu (kg)')); await user.type(screen.getByLabelText('Cân nặng mục tiêu (kg)'), '80');
    await user.click(screen.getByRole('button', { name: 'Lưu mục tiêu' }));
    expect(onSave).toHaveBeenCalledWith({ ...goal, targetWeightKg: 80 });
    expect(screen.getByRole('region', { name: 'Mục tiêu cơ thể' })).toBeTruthy(); // back to the summary after saving
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa mục tiêu' })); await user.click(screen.getByRole('checkbox', { name: /đếm lại từ hôm nay/ }));
    await user.click(screen.getByRole('button', { name: 'Lưu mục tiêu' }));
    expect(onSave).toHaveBeenLastCalledWith({ ...goal, startDate: '2026-11-18' });
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa mục tiêu' })); await user.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(screen.getByRole('region', { name: 'Mục tiêu cơ thể' })).toBeTruthy();
  });
});
