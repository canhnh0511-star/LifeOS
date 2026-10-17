// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { DailyDashboardDto, QuestDto } from '../api/types';
import { WorkoutStats } from './WorkoutStats';

afterEach(cleanup);
const gym = { habitId: 'h', title: 'Buổi A', objectives: [{ id: 'o', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 0 }] } as unknown as QuestDto;
const other = { habitId: 'x', title: 'Piano', objectives: [] } as unknown as QuestDto;
const dash = (quests: QuestDto[]) => ({ quests }) as DailyDashboardDto;

describe('workout stats (B-41)', () => {
  it('reads the set log only for gym quests and shows totals and muscle shares', async () => {
    const list = vi.fn(async (_h: string, d: string) => d === '2026-10-19' ? [{ exercise: 'Machine Chest Press', setNo: 1, reps: 10, weightKg: 40 }, { exercise: 'Machine Chest Press', setNo: 2, reps: 10, weightKg: 40 }] : []);
    render(<WorkoutStats today="2026-10-19" period="7d" loadDay={async () => dash([gym, other])} setLog={{ list }}/>);
    expect(await screen.findByText('Tổng set')).toBeTruthy();
    expect(screen.getByText('800 kg')).toBeTruthy();
    expect(screen.getByText(/Ngực/).textContent).toContain('100%');
    expect(list).toHaveBeenCalledTimes(7); expect(list.mock.calls.every(c => c[0] === 'h')).toBe(true);
  });
  it('says so when nothing was logged, and reports a failure', async () => {
    render(<WorkoutStats today="2026-10-19" period="7d" loadDay={async () => dash([gym])} setLog={{ list: async () => [] }}/>);
    expect(await screen.findByText(/Chưa có set nào/)).toBeTruthy();
    cleanup();
    render(<WorkoutStats today="2026-10-19" period="30d" loadDay={async () => { throw new Error('x'); }} setLog={{ list: async () => [] }}/>);
    expect((await screen.findByRole('alert')).textContent).toContain('Không tải được');
  });
});
