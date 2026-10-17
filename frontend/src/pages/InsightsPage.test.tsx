// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { HabitDto } from '../api/types';
import { viName } from '../domain/exerciseLibrary';
import { InsightsPage } from './InsightsPage';

afterEach(cleanup);
const set = (exercise: string, weightKg: number | null, reps = 10) => ({ exercise, setNo: 1, reps, weightKg });
const habit = { id: 'a', goalId: 'g', title: 'Buổi A', targetMinutes: 45, xpReward: 50, weekdays: [1, 3, 6], startDate: '2026-09-01', endDate: null, status: 'ACTIVE',
  objectives: [{ id: 'o1', title: 'Leg Press', target: 20, unit: 'rep', step: 10 }, { id: 'o2', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10 }] } as HabitDto;
const history = async () => [
  { date: '2026-10-05', sets: [set('Leg Press', 60)] }, { date: '2026-10-07', sets: [set('Leg Press', 65)] },
  { date: '2026-10-12', sets: [set('Leg Press', 70), set('Leg Press', 70), set('Machine Chest Press', 30)] },
  { date: '2026-10-14', sets: [set('Leg Press', 75)] }, { date: '2026-10-17', sets: [] }
];

describe('Tiến độ (designed screen)', () => {
  it('shows the week sessions done against the plan, and the weekly boss with what is left', async () => {
    render(<InsightsPage habits={[habit]} today="2026-10-17" loadHistory={history}/>);
    expect(await screen.findByText('TUẦN NÀY · 2/3 BUỔI')).toBeTruthy();
    expect(screen.getByText('Cổng tuần: Slime Quán tính')).toBeTruthy();
    expect(screen.getByText('Còn 1 buổi')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Các ngày trong tuần' }).querySelectorAll('li')).toHaveLength(7);
    expect(screen.getByLabelText('T2 đã tập')).toBeTruthy(); expect(screen.getByLabelText('T3 chưa tập')).toBeTruthy();
    expect(screen.getByLabelText('T7 hôm nay')).toBeTruthy();
  });
  it('lists the heaviest weight per exercise with its gain', async () => {
    render(<InsightsPage habits={[habit]} today="2026-10-17" loadHistory={history}/>);
    const row = (await screen.findByText(viName('Leg Press'))).closest('li')!;
    expect(within(row).getByText('+15 kg')).toBeTruthy(); expect(within(row).getByText('75')).toBeTruthy();
    expect(within(row).getByRole('img').getAttribute('aria-label')).toMatch(/60.*75/);
  });
  it('shows sets done against the sets planned for each muscle group this week', async () => {
    render(<InsightsPage habits={[habit]} today="2026-10-17" loadHistory={history}/>);
    const list = within(await screen.findByRole('list', { name: 'Set theo nhóm cơ' }));
    expect(list.getByText('Chân').closest('li')!.textContent).toContain('3/6'); // 3 sets logged, 2 sets x 3 sessions planned
    expect(list.getByText('Ngực').closest('li')!.textContent).toContain('1/6'); expect(list.queryByText('Tay')).toBeNull(); // no planned or logged sets for arms
  });
  it('says so when nothing is logged yet, and when loading fails', async () => {
    render(<InsightsPage habits={[habit]} today="2026-10-17" loadHistory={async () => []}/>);
    expect(await screen.findByText(/Chưa có buổi tập nào/)).toBeTruthy();
    cleanup();
    render(<InsightsPage habits={[habit]} today="2026-10-17" loadHistory={async () => { throw new Error('x'); }}/>);
    expect((await screen.findByRole('alert')).textContent).toContain('Không tải được');
  });
});
