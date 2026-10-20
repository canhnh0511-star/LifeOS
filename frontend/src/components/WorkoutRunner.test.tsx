// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuestDto, WorkoutSetDto, WorkoutSetInput } from '../api/types';
import { QuestSheet } from './QuestSheet';
import { firstOpenIndex } from './WorkoutRunner';
import { exerciseByName } from '../domain/exerciseLibrary';
import type { SetLogApi } from './SetLog';

afterEach(() => { cleanup(); localStorage.clear(); });
const quest: QuestDto = { habitId: 'h', goalId: 'g', goalTitle: 'G', title: 'Buổi A', targetMinutes: 45, xpReward: 40, category: 'HEALTH', date: '2026-10-19', status: 'PENDING', completedAt: null,
  objectives: [{ id: 'o1', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 0 }, { id: 'o2', title: 'Plank', target: 135, unit: 'giây', step: 45, value: 0 }] } as QuestDto;
function fakeApi(initial: WorkoutSetDto[] = []) {
  let sets = [...initial];
  return {
    list: vi.fn(async () => sets),
    record: vi.fn(async (_h: string, _d: string, i: WorkoutSetInput) => { sets = [...sets, { exercise: i.exercise, setNo: i.setNo, reps: i.reps, weightKg: i.weightKg ?? null }]; return sets; }),
    remove: vi.fn(async () => sets),
    last: vi.fn(async () => ({ date: '2026-10-15', sets: [{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }] }))
  } satisfies SetLogApi;
}
const start = async (api: SetLogApi, onToggle = vi.fn()) => {
  render(<QuestSheet quest={quest} date="2026-10-19" busy={false} onClose={() => {}} setLog={api} onToggle={onToggle} onSetObjective={() => {}}/>);
  await screen.findByLabelText('Nhật ký set Đẩy ngực với máy');
  await waitFor(() => expect(api.list).toHaveBeenCalled()); await act(async () => { await new Promise(r => setTimeout(r, 50)); });
  await userEvent.click(await screen.findByRole('button', { name: /Tập từng set/ }));
  return onToggle;
};

const dialog = () => screen.getByRole('dialog', { name: /Buổi tập/ });
const doneSets = (name: string, n: number, w: number | null = 40) => Array.from({ length: n }, (_, i) => ({ exercise: name, setNo: i + 1, reps: 10, weightKg: w }));

describe('workout runner: its own full screen, one step at a time', () => {
  it('opens as a separate full screen (a modal dialog), with the session clock running from the start', async () => {
    await start(fakeApi());
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(within(dialog()).getByRole('timer', { name: 'Thời gian buổi tập' }).textContent).toMatch(/\d\d:\d\d/);
    expect(screen.getByRole('button', { name: 'Dừng đồng hồ buổi tập' })).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });
  it('shows only the current step: name, picture, one instruction, the set controls and one big button; no side arrows over the picture', async () => {
    await start(fakeApi());
    const d = within(dialog());
    expect(d.getByText(/^Bài 1\/2 · /)).toBeTruthy();
    expect(d.getByRole('heading', { name: 'Đẩy ngực với máy' })).toBeTruthy();
    expect(d.getAllByRole('img', { name: /Ảnh hướng dẫn Đẩy ngực với máy/ })).toHaveLength(1);
    expect(d.getByText(/Set 1 \/ 2/)).toBeTruthy();
    expect(d.getByRole('button', { name: 'Hoàn thành set' })).toBeTruthy();
    expect(d.queryByRole('timer', { name: 'Thời gian nghỉ' })).toBeNull();
    expect(d.queryByLabelText('thời gian nghỉ hiện tại')).toBeNull(); // rest is chosen on the rest step, not as a control far below
  });
  it('shows progress in sets, last time and a one-line instruction', async () => {
    await start(fakeApi(doneSets('Machine Chest Press', 1)));
    expect(screen.getByRole('group', { name: 'Tiến độ buổi tập' }).textContent).toContain('Đã xong 1/5 set');
    expect(await screen.findByText(/Lần trước.*10 × 40 kg/)).toBeTruthy();
    expect(screen.getByLabelText('Gợi ý động tác').textContent!.length).toBeGreaterThan(10);
  });
  it('labels each set pill: "Set N" for to-do, a tick with reps for done', async () => {
    await start(fakeApi(doneSets('Machine Chest Press', 1)));
    const pills = screen.getByLabelText('Các set');
    expect(pills.textContent).toContain('10 × 40'); expect(pills.textContent).toContain('Set 2');
    expect(pills.querySelector('[aria-label="Set 1: xong, 10 rep, 40 kg"]')).toBeTruthy();
  });
  it('shows technique in place without leaving the step', async () => {
    await start(fakeApi());
    await userEvent.click(screen.getByRole('button', { name: 'Kỹ thuật' }));
    expect(screen.getByRole('region', { name: /Chi tiết Đẩy ngực với máy/ })).toBeTruthy();
    expect(screen.getAllByRole('img', { name: /Ảnh hướng dẫn Đẩy ngực với máy/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Hoàn thành set' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Ẩn kỹ thuật' }));
    expect(screen.queryByRole('region', { name: /Chi tiết/ })).toBeNull();
  });
  it('the close button pauses the session clock and returns to the quest; Escape does the same', async () => {
    await start(fakeApi());
    await userEvent.click(screen.getByRole('button', { name: 'Tạm dừng buổi tập' }));
    expect(screen.queryByRole('dialog', { name: /Buổi tập/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Xác nhận hoàn thành/ })).toBeTruthy();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeTruthy(); // the quest's own stopwatch kept the time and is paused
  });
  it('Escape also leaves the workout', async () => {
    await start(fakeApi());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /Buổi tập/ })).toBeNull();
  });
});

describe('workout runner: sets and rest as separate steps', () => {
  it('picks the first exercise that still has sets to do', () => {
    const [a, b] = [exerciseByName('Machine Chest Press')!, exerciseByName('Plank')!];
    expect(firstOpenIndex([a, b], [])).toBe(0);
    expect(firstOpenIndex([a, b], doneSets(a.name, 2))).toBe(1);
  });
  it('records the set with the adjusted reps and weight, then moves to the rest step with the next set shown; no XP, no completion', async () => {
    const api = fakeApi(); const onToggle = await start(api);
    await waitFor(() => expect((screen.getByLabelText('mức tạ (kg) hiện tại') as HTMLInputElement).value).toBe('40'));
    await userEvent.click(screen.getByRole('button', { name: 'Tăng mức tạ (kg)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Giảm rep' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Machine Chest Press', setNo: 1, reps: 9, weightKg: 42.5 });
    const rest = await screen.findByRole('region', { name: 'Nghỉ giữa set' });
    expect(within(rest).getByRole('timer', { name: 'Thời gian nghỉ' }).textContent).toBe('01:30');
    expect(within(rest).getByText(/Set 2 \/ 2/)).toBeTruthy(); expect(within(rest).getByText('Đẩy ngực với máy')).toBeTruthy();
    expect(screen.getByRole('timer', { name: 'Thời gian buổi tập' })).toBeTruthy(); // the session clock stays on every step
    expect(screen.queryByRole('button', { name: 'Hoàn thành set' })).toBeNull();
    expect(onToggle).not.toHaveBeenCalled();
  });
  it('shows the rest as a big number inside a glowing ring that is full at the start and stays a decorative picture', async () => {
    await start(fakeApi());
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    const rest = await screen.findByRole('region', { name: 'Nghỉ giữa set' });
    const ring = rest.querySelector('.wr-ring')!;
    expect(ring.getAttribute('data-fraction')).toBe('1.000');
    expect(ring.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(ring.querySelector('.wr-ring-center')!.contains(within(rest).getByRole('timer', { name: 'Thời gian nghỉ' }))).toBe(true);
    expect(ring.querySelector('.wr-ring-glow')).not.toBeNull(); expect(ring.querySelector('.wr-ring-arc')).not.toBeNull();
    await userEvent.click(within(rest).getByRole('button', { name: 'Tăng thời gian nghỉ' })); // more time keeps the ring in proportion, never above full
    expect(Number(ring.getAttribute('data-fraction'))).toBeLessThanOrEqual(1);
  });
  it('adjusts the rest by 15 seconds on the rest step, remembers it, and can skip the countdown', async () => {
    await start(fakeApi());
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tăng thời gian nghỉ' }));
    expect(screen.getByRole('timer', { name: 'Thời gian nghỉ' }).textContent).toBe('01:45');
    await userEvent.click(screen.getByRole('button', { name: 'Giảm thời gian nghỉ' })); await userEvent.click(screen.getByRole('button', { name: 'Giảm thời gian nghỉ' }));
    expect(screen.getByRole('timer', { name: 'Thời gian nghỉ' }).textContent).toBe('01:15');
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua nghỉ' }));
    expect(screen.queryByRole('region', { name: 'Nghỉ giữa set' })).toBeNull();
    expect(screen.getByText(/Set 2 \/ 2/)).toBeTruthy();
    expect(localStorage.getItem('lifeos.rest.machine-chest-press')).toBe('75');
  });
  it('after the last set of an exercise, rests and then opens the next exercise; a hold has no weight', async () => {
    const api = fakeApi(doneSets('Machine Chest Press', 1));
    await start(api);
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    const rest = await screen.findByRole('region', { name: 'Nghỉ giữa set' });
    expect(within(rest).getByText('Plank (giữ thân thẳng)')).toBeTruthy(); expect(within(rest).getByText(/Set 1 \/ 3/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua nghỉ' }));
    expect(screen.getByRole('heading', { name: 'Plank (giữ thân thẳng)' })).toBeTruthy();
    expect(screen.queryByLabelText('mức tạ (kg) hiện tại')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect(api.record).toHaveBeenLastCalledWith('h', '2026-10-19', { exercise: 'Plank', setNo: 1, reps: 45, weightKg: null });
  });
  it('can go back to a finished exercise and forward again', async () => {
    await start(fakeApi(doneSets('Machine Chest Press', 2)));
    expect(screen.getByRole('heading', { name: 'Plank (giữ thân thẳng)' })).toBeTruthy(); // opens on the first exercise with sets left
    await userEvent.click(screen.getByRole('button', { name: 'Bài trước' }));
    expect(screen.getByRole('status').textContent).toContain('Đã xong 2/2');
    await userEvent.click(screen.getByRole('button', { name: /Bài tiếp theo/ }));
    expect(screen.getByRole('heading', { name: 'Plank (giữ thân thẳng)' })).toBeTruthy();
  });
  it('shows the API message and stays on the set step (no rest) when saving fails', async () => {
    const api = fakeApi(); api.record.mockRejectedValueOnce(new Error('Chỉ có thể ghi set trong 7 ngày gần nhất.'));
    await start(api);
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect((await screen.findByRole('alert')).textContent).toContain('7 ngày');
    expect(screen.queryByRole('region', { name: 'Nghỉ giữa set' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hoàn thành set' })).toBeTruthy();
  });
  it('removes the set just recorded', async () => {
    const api = fakeApi(doneSets('Machine Chest Press', 1)); api.remove.mockImplementation(async () => []);
    await start(api);
    await userEvent.click(screen.getByRole('button', { name: /Xoá set 1 vừa ghi/ }));
    expect(api.remove).toHaveBeenCalledWith('h', '2026-10-19', 'Machine Chest Press', 1);
  });
  it('uses the rest remembered for the exercise on the next visit', async () => {
    localStorage.setItem('lifeos.rest.machine-chest-press', '120');
    await start(fakeApi());
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect((await screen.findByRole('timer', { name: 'Thời gian nghỉ' })).textContent).toBe('02:00');
  });
  it('lets you type reps and weight directly (comma or dot)', async () => {
    const api = fakeApi(); await start(api);
    const reps = screen.getByLabelText('rep hiện tại') as HTMLInputElement, weight = screen.getByLabelText('mức tạ (kg) hiện tại') as HTMLInputElement;
    await userEvent.clear(reps); await userEvent.type(reps, '12');
    await userEvent.clear(weight); await userEvent.type(weight, '47,5');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Machine Chest Press', setNo: 1, reps: 12, weightKg: 47.5 });
  });
});

describe('workout runner: the final step', () => {
  const all = doneSets('Machine Chest Press', 2).concat(doneSets('Plank', 3, null).map(s => ({ ...s, reps: 45 })));
  it('shows a summary and the end button once every set is done, and ends the session only on that button', async () => {
    const onToggle = await start(fakeApi(all));
    expect(onToggle).not.toHaveBeenCalled();
    const fin = screen.getByRole('region', { name: 'Hoàn thành buổi tập' });
    expect(within(fin).getByText('5/5')).toBeTruthy(); expect(within(fin).getByText(/Ghi set không cộng XP/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Kết thúc buổi tập · \+40 XP/ }));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'h' }));
  });
  it('lets you review the exercises instead of ending', async () => {
    await start(fakeApi(all));
    await userEvent.click(screen.getByRole('button', { name: 'Xem lại các bài' }));
    expect(screen.getByRole('heading', { name: 'Plank (giữ thân thẳng)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Kết thúc buổi tập/ })).toBeNull();
  });
  it('does not offer to end the session while sets are still missing', async () => {
    await start(fakeApi());
    expect(screen.queryByRole('button', { name: /Kết thúc buổi tập/ })).toBeNull();
  });
});
