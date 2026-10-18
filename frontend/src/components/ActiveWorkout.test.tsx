// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuestDto, WorkoutSetDto, WorkoutSetInput } from '../api/types';
import { QuestSheet } from './QuestSheet';
import { firstOpenIndex } from './ActiveWorkout';
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

describe('active workout: dungeon floors', () => {
  it('calls the current exercise "Tầng n/N" with its muscle group, and moves to the next floor', async () => {
    await start(fakeApi());
    expect(screen.getByText(/^Tầng 1\/2 · /)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Bài sau' }));
    expect(screen.getByText(/^Tầng 2\/2 · /)).toBeTruthy();
  });
  it('shows the instruction picture right under the name, and the technique panel does not repeat it', async () => {
    await start(fakeApi());
    expect(screen.getAllByRole('img', { name: /Ảnh hướng dẫn Đẩy ngực với máy/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /Kỹ thuật/ }));
    expect(screen.getAllByRole('img', { name: /Ảnh hướng dẫn Đẩy ngực với máy/ })).toHaveLength(1);
    expect(screen.getByRole('region', { name: /Chi tiết Đẩy ngực với máy/ })).toBeTruthy();
  });
});

describe('active workout: battle mode (Phase 1)', () => {
  it('shows how many exercises are finished out of the total, and updates when one is completed', async () => {
    const api = fakeApi([{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }, { exercise: 'Machine Chest Press', setNo: 2, reps: 10, weightKg: 40 }]);
    await start(api);
    expect(screen.getByRole('group', { name: 'Tiến độ buổi tập' }).textContent).toContain('Đã xong 1/2 bài');
  });
  it('shows 0/2 at the start', async () => {
    await start(fakeApi());
    expect(screen.getByRole('group', { name: 'Tiến độ buổi tập' }).textContent).toContain('Đã xong 0/2 bài');
  });
  it('shows last time on the exercise card, and a one-line instruction', async () => {
    await start(fakeApi());
    expect(await screen.findByText(/Lần trước/)).toBeTruthy();
    expect(screen.getByText(/Lần trước.*10 × 40 kg/)).toBeTruthy();
    expect(screen.getByLabelText('Gợi ý động tác').textContent!.length).toBeGreaterThan(10);
  });
  it('labels each set pill: "Set N" for to-do, a tick with reps for done', async () => {
    await start(fakeApi([{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }]));
    const pills = screen.getByLabelText('Các set');
    expect(pills.textContent).toContain('10 × 40');
    expect(pills.textContent).toContain('Set 2');
    expect(pills.querySelector('[aria-label="Set 1: xong, 10 rep, 40 kg"]')).toBeTruthy();
  });
  it('shows technique in place under the exercise, without leaving the workout screen', async () => {
    await start(fakeApi());
    await userEvent.click(screen.getByRole('button', { name: 'Kỹ thuật' }));
    expect(screen.getByRole('region', { name: /Chi tiết Đẩy ngực với máy/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hoàn thành set' })).toBeTruthy(); // the set controls are still right there
    await userEvent.click(screen.getByRole('button', { name: 'Ẩn kỹ thuật' }));
    expect(screen.queryByRole('region', { name: /Chi tiết/ })).toBeNull();
  });
  it('"Tạm dừng" leaves the screen and says the logged sets are kept', async () => {
    await start(fakeApi());
    expect(screen.getByText(/Các set đã ghi được lưu/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    expect(screen.queryByRole('button', { name: 'Hoàn thành set' })).toBeNull();
  });
});

describe('active workout (B-38)', () => {
  it('picks the first exercise that still has sets to do', () => {
    const [a, b] = [exerciseByName('Machine Chest Press')!, exerciseByName('Plank')!];
    expect(firstOpenIndex([a, b], [])).toBe(0);
    expect(firstOpenIndex([a, b], [{ exercise: a.name, setNo: 1, reps: 10, weightKg: null }, { exercise: a.name, setNo: 2, reps: 10, weightKg: null }])).toBe(1);
  });
  it('shows set N / M, adjusts reps and weight, records the set and starts the rest, without XP or completion', async () => {
    const api = fakeApi(); const onToggle = await start(api);
    expect(screen.getByText(/Set 1 \/ 2/)).toBeTruthy();
    await waitFor(() => expect((screen.getByLabelText('mức tạ (kg) hiện tại') as HTMLInputElement).value).toBe('40'));
    await userEvent.click(screen.getByRole('button', { name: 'Tăng mức tạ (kg)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Giảm rep' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Machine Chest Press', setNo: 1, reps: 9, weightKg: 42.5 });
    expect(await screen.findByRole('timer')).toBeTruthy();
    expect(screen.getByText(/Set 2 \/ 2/)).toBeTruthy();
    expect(onToggle).not.toHaveBeenCalled();
  });
  it('adjusts the rest time and lets you skip the countdown', async () => {
    await start(fakeApi());
    expect(screen.getByLabelText('thời gian nghỉ hiện tại').textContent).toBe('90 giây');
    await userEvent.click(screen.getByRole('button', { name: 'Tăng thời gian nghỉ' }));
    expect(screen.getByLabelText('thời gian nghỉ hiện tại').textContent).toBe('105 giây');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ qua nghỉ' }));
    expect(screen.queryByRole('timer')).toBeNull();
  });
  it('moves to the next exercise when all sets are done; a hold has no weight', async () => {
    const api = fakeApi([{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }, { exercise: 'Machine Chest Press', setNo: 2, reps: 10, weightKg: 40 }]);
    await start(api);
    expect(screen.getByRole('heading', { name: 'Plank (giữ thân thẳng)' })).toBeTruthy(); // opens on the first exercise with sets left
    await userEvent.click(screen.getByRole('button', { name: 'Bài trước' }));
    expect(screen.getByRole('status').textContent).toContain('Đã xong 2/2');
    await userEvent.click(screen.getByRole('button', { name: /Bài tiếp theo/ }));
    expect(screen.getByRole('heading', { name: 'Plank (giữ thân thẳng)' })).toBeTruthy();
    expect(screen.queryByLabelText('mức tạ (kg) hiện tại')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Plank', setNo: 1, reps: 45, weightKg: null });
  });
  it('shows the API message and no rest when saving fails; exit returns to the quest', async () => {
    const api = fakeApi(); api.record.mockRejectedValueOnce(new Error('Chỉ có thể ghi set trong 7 ngày gần nhất.'));
    await start(api);
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect((await screen.findByRole('alert')).textContent).toContain('7 ngày');
    expect(screen.queryByRole('timer')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    expect(screen.getByRole('button', { name: /Xác nhận hoàn thành/ })).toBeTruthy();
  });
  it('deletes a set from the screen and remembers the rest chosen for the exercise', async () => {
    const api = fakeApi([{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }]);
    api.remove.mockImplementation(async () => []);
    await start(api);
    await userEvent.click(screen.getByRole('button', { name: 'Tăng thời gian nghỉ' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Xoá set 1 của Đẩy ngực với máy' }).at(-1)!);
    expect(api.remove).toHaveBeenCalledWith('h', '2026-10-19', 'Machine Chest Press', 1);
    cleanup();
    await start(fakeApi());
    expect(screen.getByLabelText('thời gian nghỉ hiện tại').textContent).toBe('105 giây');
  });
  it('lets you type reps and weight directly (comma or dot)', async () => {
    const api = fakeApi(); await start(api);
    const reps = screen.getByLabelText('rep hiện tại') as HTMLInputElement, weight = screen.getByLabelText('mức tạ (kg) hiện tại') as HTMLInputElement;
    await userEvent.clear(reps); await userEvent.type(reps, '12');
    await userEvent.clear(weight); await userEvent.type(weight, '47,5');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành set' }));
    expect(api.record).toHaveBeenCalledWith('h', '2026-10-19', { exercise: 'Machine Chest Press', setNo: 1, reps: 12, weightKg: 47.5 });
  });
  it('offers to end the whole session once every set is done, with the same confirmation as the detail screen', async () => {
    const all = [1, 2].map(n => ({ exercise: 'Machine Chest Press', setNo: n, reps: 10, weightKg: 40 })).concat([1, 2, 3].map(n => ({ exercise: 'Plank', setNo: n, reps: 45, weightKg: null as unknown as number })));
    const onToggle = await start(fakeApi(all));
    expect(onToggle).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Kết thúc buổi tập · \+40 XP/ }));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'h' }));
  });
  it('does not offer to end the session while sets are still missing', async () => {
    await start(fakeApi());
    expect(screen.queryByRole('button', { name: /Kết thúc buổi tập/ })).toBeNull();
  });
});
