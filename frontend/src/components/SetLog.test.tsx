// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuestDto, WorkoutSetDto, WorkoutSetInput } from '../api/types';
import { QuestSheet } from './QuestSheet';
import { nextSetNo, parseWeight, type SetLogApi } from './SetLog';

afterEach(() => { cleanup(); localStorage.clear(); });

const quest = (title = 'Machine Chest Press'): QuestDto => ({ habitId: 'h', goalId: 'g', goalTitle: 'G', title: 'Buổi A', targetMinutes: 45, xpReward: 40, category: 'HEALTH', date: '2026-10-19', status: 'PENDING', completedAt: null,
  objectives: [title === 'Plank' ? { id: 'o1', title, target: 135, unit: 'giây', step: 45, value: 0 } : { id: 'o1', title, target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto);

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
    const box = await screen.findByLabelText('Nhật ký set Đẩy ngực với máy');
    await userEvent.clear(within(box).getByLabelText('Mức tạ Đẩy ngực với máy'));
    await userEvent.type(within(box).getByLabelText('Mức tạ Đẩy ngực với máy'), '42,5');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 42.5 });
    expect(await within(box).findByText(/Set 1: 10 rep · 42,5 kg/)).toBeTruthy();
    expect(within(box).getByRole('button', { name: /Ghi set 2/ })).toBeTruthy();
    expect(onToggle).not.toHaveBeenCalled(); expect(onSetObjective).not.toHaveBeenCalled();
  });
  it('shows the sets already logged and last time, and deletes one', async () => {
    const api = fakeApi([{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }], { date: '2026-10-15', sets: [{ exercise: 'Machine Chest Press', setNo: 1, reps: 12, weightKg: 35 }] });
    open(api);
    const box = await screen.findByLabelText('Nhật ký set Đẩy ngực với máy');
    expect(await within(box).findByText(/Set 1: 10 rep · 40 kg/)).toBeTruthy();
    await waitFor(() => expect(box.textContent).toContain('Lần trước'));
    expect(box.textContent).toContain('12 · 35 kg');
    await userEvent.click(within(box).getByRole('button', { name: 'Xoá set 1 của Đẩy ngực với máy' }));
    expect(api.remove).toHaveBeenCalledWith('h', '2026-10-19', 'Machine Chest Press', 1);
    await waitFor(() => expect(within(box).queryByText(/Set 1:/)).toBeNull());
  });
  it('refuses a bad weight or rep count on the spot, without calling the API', async () => {
    const api = fakeApi(); open(api);
    const box = await screen.findByLabelText('Nhật ký set Đẩy ngực với máy');
    await userEvent.type(within(box).getByLabelText('Mức tạ Đẩy ngực với máy'), 'nặng');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect(within(box).getByRole('alert').textContent).toContain('Mức tạ không hợp lệ');
    await userEvent.clear(within(box).getByLabelText('Mức tạ Đẩy ngực với máy'));
    await userEvent.clear(within(box).getByLabelText('Số rep Đẩy ngực với máy'));
    await userEvent.type(within(box).getByLabelText('Số rep Đẩy ngực với máy'), '0');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect(within(box).getByRole('alert').textContent).toContain('1 đến 1000');
    expect(api.record).not.toHaveBeenCalled();
  });
  it('shows the API message when saving fails and keeps the list as it was', async () => {
    const api = fakeApi(); api.record.mockRejectedValueOnce(new Error('Chỉ có thể ghi set trong 7 ngày gần nhất.'));
    open(api);
    const box = await screen.findByLabelText('Nhật ký set Đẩy ngực với máy');
    await userEvent.click(within(box).getByRole('button', { name: /Ghi set 1/ }));
    expect((await screen.findAllByRole('alert')).some(a => a.textContent?.includes('7 ngày'))).toBe(true);
    expect(within(box).queryByText(/Set 1:/)).toBeNull();
  });
  it('a hold such as a plank logs seconds and has no weight field', async () => {
    const api = fakeApi(); open(api, quest('Plank'));
    const box = await screen.findByLabelText('Nhật ký set Plank (giữ thân thẳng)');
    expect(within(box).queryByLabelText('Mức tạ Plank (giữ thân thẳng)')).toBeNull();
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
  it('shows technique in place (no popup) for a library exercise only, and collapses it again', async () => {
    const q = quest(); q.objectives = [...q.objectives, { id: 'o2', title: 'Bài tự đặt tên', target: 3, unit: 'lần', step: 1, value: 0 } as QuestDto['objectives'][number]];
    render(<QuestSheet quest={q} date="2026-10-19" busy={false} onClose={() => {}} onToggle={() => {}} onSetObjective={() => {}}/>);
    expect(screen.queryByRole('button', { name: 'Kỹ thuật Bài tự đặt tên' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Kỹ thuật Đẩy ngực với máy' }));
    expect(screen.getByRole('region', { name: 'Chi tiết Đẩy ngực với máy' })).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1); // still only the quest sheet: nothing was stacked on top
    expect(screen.getByRole('dialog', { name: 'Buổi A' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn' }));
    expect(screen.queryByRole('region', { name: 'Chi tiết Đẩy ngực với máy' })).toBeNull();
  });
});

describe('session header (B-37)', () => {
  it('lists the muscle groups of the session and offers to start it above the checklist', () => {
    open(fakeApi());
    expect(screen.getByLabelText('Nhóm cơ của buổi').textContent).toBe('Ngực');
    const start = screen.getByRole('button', { name: /Tập từng set/ }), list = screen.getByLabelText('Danh sách việc của Buổi A');
    expect(start.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('plan numbers beat library defaults', () => {
  it('uses sets and reps from the checklist line (a plan with 2 sets of 12 for Leg Press, whose library default is 3 x 12)', () => {
    const q = quest('Leg Press'); q.objectives = [{ id: 'o1', title: 'Leg Press', target: 24, unit: 'rep', step: 12, value: 0 } as QuestDto['objectives'][number]];
    open(fakeApi(), q);
    expect(screen.getByLabelText('Nhật ký set Đạp đùi với máy').textContent).toContain('Kế hoạch 2 set × 12 rep');
  });
});
