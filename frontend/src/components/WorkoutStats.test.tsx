// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { WorkoutStatsDto } from '../api/types';
import { WorkoutStats } from './WorkoutStats';

afterEach(cleanup);
const stats = (over: Partial<WorkoutStatsDto> = {}): WorkoutStatsDto => ({ from: '2026-10-13', to: '2026-10-19', sessions: 1, days: [{ date: '2026-10-19', sets: 2 }], exercises: [{ exercise: 'Machine Chest Press', sets: 2, reps: 20, volumeKg: 800 }], ...over });

describe('workout stats (B-41)', () => {
  it('asks the server once for the period and shows totals and muscle shares', async () => {
    const loadStats = vi.fn(async () => stats());
    render(<WorkoutStats period="7d" loadStats={loadStats}/>);
    expect(await screen.findByText('Tổng set')).toBeTruthy();
    expect(screen.getByText('800 kg')).toBeTruthy();
    expect(screen.getByText(/Ngực/).textContent).toContain('100%');
    expect(loadStats).toHaveBeenCalledTimes(1); expect(loadStats).toHaveBeenCalledWith(7);
  });
  it('asks for 30 days on the month tab, says so when nothing was logged, and reports a failure', async () => {
    const loadStats = vi.fn(async () => stats({ sessions: 0, days: [], exercises: [] }));
    render(<WorkoutStats period="30d" loadStats={loadStats}/>);
    expect(await screen.findByText(/Chưa có set nào/)).toBeTruthy(); expect(loadStats).toHaveBeenCalledWith(30);
    cleanup();
    render(<WorkoutStats period="7d" loadStats={async () => { throw new Error('x'); }}/>);
    expect((await screen.findByRole('alert')).textContent).toContain('Không tải được');
  });
});
