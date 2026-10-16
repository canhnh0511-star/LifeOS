// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditHabitForm } from './forms';
import type { HabitDto } from '../api/types';

afterEach(cleanup);
const habit: HabitDto = { id: 'h1', goalId: 'g1', title: 'Gym', targetMinutes: 60, xpReward: 50, weekdays: [1, 3, 5], startDate: '2026-10-01', endDate: null, status: 'ACTIVE', objectives: [] };

describe('EditHabitForm', () => {
  it('sends only the fields that changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditHabitForm habit={habit} onClose={() => {}} onSave={onSave}/>);
    await userEvent.clear(screen.getByLabelText(/^Thói quen/)); await userEvent.type(screen.getByLabelText(/^Thói quen/), 'Gym toàn thân');
    await userEvent.click(screen.getByRole('button', { name: 'T3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onSave).toHaveBeenCalledWith({ title: 'Gym toàn thân', weekdays: [1, 2, 3, 5] });
  });
  it('closes without calling the API when nothing changed', async () => {
    const onSave = vi.fn(); const onClose = vi.fn();
    render(<EditHabitForm habit={habit} onClose={onClose} onSave={onSave}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onSave).not.toHaveBeenCalled(); expect(onClose).toHaveBeenCalled();
  });
  it('will not submit with no weekday selected', async () => {
    render(<EditHabitForm habit={{ ...habit, weekdays: [1] }} onClose={() => {}} onSave={vi.fn()}/>);
    await userEvent.click(screen.getByRole('button', { name: 'T2' }));
    expect((screen.getByRole('button', { name: 'Lưu thay đổi' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('archives only after an explicit confirmation, and can be backed out of', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditHabitForm habit={habit} onClose={() => {}} onSave={onSave}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu trữ thói quen' }));
    expect(onSave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Giữ lại' }));
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu trữ thói quen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu trữ' }));
    expect(onSave).toHaveBeenCalledWith({ status: 'ARCHIVED' });
  });
});
