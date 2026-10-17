// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuestDto, WorkoutSetDto, WorkoutSetInput } from '../api/types';
import { QuestSheet } from './QuestSheet';
import { nextSetNo, parseWeight, type SetLogApi } from './SetLog';

afterEach(() => { cleanup(); localStorage.clear(); });

const quest = (title = 'Machine Chest Press'): QuestDto => ({ habitId: 'h', goalId: 'g', goalTitle: 'G', title: 'Buổi A', targetMinutes: 45, xpReward: 40, category: 'HEALTH', date: '2026-10-19', status: 'PENDING', completedAt: null,
  objectives: [{ id: 'o1', title, target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto);

/** An in-memory stand-in for the API that remembers what was written. */
function fakeApi(initial: WorkoutSetDto[] = [], last: { date: string | null; sets: WorkoutSetDto[] } = { date: null, sets: [] }) {
  let sets = [...initial];
  const api = {
    list: vi.fn(async () => sets),
    record: vi.fn(async (_h: string, _d: string, input: WorkoutSetInput) => { sets = [...sets.filter(s => s.setNo !== input.setNo), { exercise: input.exercise, setNo: input.setNo, reps: input.reps, weightKg: input.weightKg ?? null }].sort((a, b) => a.setNo - b.setNo); return sets; }),
    remove: vi.fn(async (_h: string, _d: string, _e: string, no: number) => { sets = sets.filter(s => s.setNo !== no); return sets; }),
    last: vi.fn(async () => last)
  };
  return api satisfies SetLogApi;
}
const open = (api: SetLogApi, q = quest(), handlers = { onToggle: vi.fn(), onSetObjective: vi.fn() }) => {
  render(<QuestSheet quest={q} date="2026-10-19" busy={false} onClose={() => {}} setLog={api} {...handlers}/>);
  return handlers;
};

describe('parseWeight and nextSetNo', () => {
  it('accepts comma or dot, empty as no weight, and refuses nonsense', () => {
    expect(parseWeight('42,5')).toBe(42.5); expect(parseWeight('42.5')).toBe(42.5); expect(parseWeight(' ')).toBeNull(); expect(parseWeight('0')).toBe(0);
    for (const bad of ['abc', '-3', '1e3', '12.345', '1001', '4 2']) expect(parseWeight(bad)).toBeUndefined();
  });
  it('picks the smallest set number not used', () => {
    const s = (setNo: number) => ({ exercise: 'x', setNo, reps: 1, weightKg: null });
    expect(nextSetNo([])).toBe(1); expect(nextSetNo([s(1), s(2)])).toBe(3); expect(nextSetNo([s(2)])).toBe(1); expect(nextSetNo([s(1), s(3)])).toBe(2);
  });
});

describe('set log in the quest sheet (B-34)', () => {
  it('logs the next set with reps and weight, shows it, and does not touch the quest', async () => {
    const api = fakeApi(); const { onToggle, onSetObjective } = open(api);
    const box = await screen.findByLabelText('Nhật ký set Machine Chest Press');
    await userEvent.clear(within(box).getByLabelText('Mức tạ Machine Chest Press'));
    await userEvent.type(within(box).getByLabelText('Mức tạ Machine Chest Press'), '42,5');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 42.5 });
    expect(await within(box).findByText(/Set 1: 10 rep · 42,5 kg/)).toBeTruthy();
    expect(within(box).getByRole('button', { name: /Ghi set 2/ })).toBeTruthy();
    expect(onToggle).not.toHaveBeenCalled(); expect(onSetObjective).not.toHaveBeenCalled();
  });
  it('shows the sets already logged and last time, and deletes one', async () => {
    const api = fakeApi([{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }], { date: '2026-10-15', sets: [{ exercise: 'Machine Chest Press', setNo: 1, reps: 12, weightKg: 35 }] });
    open(api);
    const box = await screen.findByLabelText('Nhật ký set Machine Chest Press');
    expect(await within(box).findByText(/Set 1: 10 rep · 40 kg/)).toBeTruthy();
    await waitFor(() => expect(box.textContent).toContain('Lần trước'));
    expect(box.textContent).toContain('12 · 35 kg');
    await userEvent.click(within(box).getByRole('button', { name: 'Xoá set 1 của Machine Chest Press' }));
    expect(api.remove).toHaveBeenCalledWith('h', '2026-10-19', 'Machine Chest Press', 1);
    await waitFor(() => expect(within(box).queryByText(/Set 1:/)).toBeNull());
  });
  it('refuses a bad weight or rep count on the spot, without calling the API', async () => {
    const api = fakeApi(); open(api);
    const box = await screen.findByLabelText('Nhật ký set Machine Chest Press');
    await userEvent.type(within(box).getByLabelText('Mức tạ Machine Chest Press'), 'nặng');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect(within(box).getByRole('alert').textContent).toContain('Mức tạ không hợp lệ');
    await userEvent.clear(within(box).getByLabelText('Mức tạ Machine Chest Press'));
    await userEvent.clear(within(box).getByLabelText('Số rep Machine Chest Press'));
    await userEvent.type(within(box).getByLabelText('Số rep Machine Chest Press'), '0');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect(within(box).getByRole('alert').textContent).toContain('1 đến 1000');
    expect(api.record).not.toHaveBeenCalled();
  });
  it('shows the API message when saving fails and keeps the list as it was', async () => {
    const api = fakeApi(); api.record.mockRejectedValueOnce(new Error('Chỉ có thể ghi set trong 7 ngày gần nhất.'));
    open(api);
    const box = await screen.findByLabelText('Nhật ký set Machine Chest Press');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect((await screen.findAllByRole('alert')).some(a => a.textContent?.includes('7 ngày'))).toBe(true);
    expect(within(box).queryByText(/Set 1:/)).toBeNull();
  });
  it('a hold such as a plank logs seconds and has no weight field', async () => {
    const api = fakeApi(); open(api, quest('Plank'));
    const box = await screen.findByLabelText('Nhật ký set Plank');
    expect(within(box).queryByLabelText('Mức tạ Plank')).toBeNull();
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Plank', setNo: 1, reps: 45, weightKg: null });
  });
  it('has no set log for a line the library does not know, or when the API is not given', async () => {
    open(fakeApi(), quest('Bài tự đặt tên'));
    expect(screen.queryByLabelText('Nhật ký set')).toBeNull();
    cleanup();
    render(<QuestSheet quest={quest()} date="2026-10-19" busy={false} onClose={() => {}} onToggle={() => {}} onSetObjective={() => {}}/>);
    expect(screen.queryByLabelText('Nhật ký set')).toBeNull();
  });
});

describe('exercise detail from the quest sheet (B-37)', () => {
  it('opens technique for a library exercise only, and comes back to the sheet', async () => {
    const q = quest(); q.objectives = [...q.objectives, { id: 'o2', title: 'Bài tự đặt tên', target: 3, unit: 'lần', step: 1, value: 0 } as QuestDto['objectives'][number]];
    render(<QuestSheet quest={q} date="2026-10-19" busy={false} onClose={() => {}} onToggle={() => {}} onSetObjective={() => {}}/>);
    expect(screen.queryByRole('button', { name: 'Kỹ thuật Bài tự đặt tên' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Kỹ thuật Machine Chest Press' }));
    expect(screen.getByRole('dialog', { name: 'Machine Chest Press' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.getByRole('dialog', { name: 'Buổi A' })).toBeTruthy();
  });
});
