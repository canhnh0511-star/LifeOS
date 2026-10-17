// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DailyDashboardDto, HabitDto } from '../api/types';
import { viName } from '../domain/exerciseLibrary';
import { primaryNav, tabFromHash } from '../ui/nav';
import { CharacterPage } from './CharacterPage';

afterEach(() => { cleanup(); window.location.hash = ''; });

const dashboard = { date: '2026-10-15', user: { id: 'u', displayName: 'C', email: 'c@x.co', timezone: 'Asia/Ho_Chi_Minh' }, quests: [],
  progress: { totalXp: 2170, level: 4, levelStartXp: 1600, nextLevelXp: 2500, currentStreak: 4, longestStreak: 9, areas: [] },
  completedCount: 0, scheduledCount: 3, earnedXpToday: 77, journey: null, dailyRewards: [], dayStreak: 0 } as DailyDashboardDto;
const set = (exercise: string, weightKg: number, reps = 10) => ({ exercise, setNo: 1, reps, weightKg });
const history = async () => [{ date: '2026-10-05', sets: [set('Leg Press', 80)] }, { date: '2026-10-14', sets: [set('Leg Press', 100, 8)] }];
const habit = { id: 'a', goalId: 'g', title: 'A', targetMinutes: 45, xpReward: 50, weekdays: [1, 3, 6], startDate: '2026-09-01', endDate: null, status: 'ACTIVE', objectives: [{ id: 'o', title: 'Leg Press', target: 20, unit: 'rep', step: 10 }] } as HabitDto;
const page = (over: Partial<Parameters<typeof CharacterPage>[0]> = {}) => <CharacterPage dashboard={dashboard} items={[]} busyItemCode={null} onEquip={() => {}} onUnequip={() => {}} habits={[habit]} today="2026-10-17" loadHistory={history} {...over}/>;

describe('Nhân vật (designed screen)', () => {
  it('shows level, rank and the XP still missing to the next rank', async () => {
    render(page());
    expect(screen.getByText('Cấp 4')).toBeTruthy();
    expect(screen.getByText('HẠNG E · TÂN BINH')).toBeTruthy();
    expect(screen.getByText('2.170 / 2.500 XP')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Còn 330 XP lên Hạng D/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Hạng E: áo rách/ })).toBeTruthy();
    expect(screen.queryByText(/hôm nay/i)).toBeNull();            // nothing here depends on the selected day
    expect(document.body.textContent).not.toContain('77');
  });
  it('opens the rank gallery in place from the status line and collapses it', async () => {
    render(page());
    await userEvent.click(screen.getByRole('button', { name: /xem diện mạo các hạng/ }));
    const gallery = screen.getByRole('region', { name: 'Diện mạo theo hạng' });
    expect(within(gallery).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(within(gallery).getByRole('button', { name: /Thu gọn/ }));
    expect(screen.queryByRole('region', { name: 'Diện mạo theo hạng' })).toBeNull();
  });
  it('shows the five gym stats, with a dash while there is not enough data', async () => {
    render(page({ loadHistory: async () => [] }));
    const list = within(await screen.findByRole('list', { name: 'Chỉ số' }));
    expect(list.getAllByRole('listitem').map(li => li.querySelector('span')!.textContent)).toEqual(['Sức mạnh', 'Sức bền cơ', 'Khối lượng', 'Cân đối', 'Ý chí']);
    expect(list.getByText('Sức mạnh').closest('li')!.textContent).toContain('–');
  });
  it('rates the stats from the set log against your own previous 4 weeks', async () => {
    render(page());
    const list = within(await screen.findByRole('list', { name: 'Chỉ số' }));
    expect(await list.findByText('88')).toBeTruthy();            // heaviest Leg Press 100 against 80 before
    expect(list.getByText('Sức mạnh').closest('li')!.textContent).toContain('88');
  });
  it('lists one shadow per personal record, newest first', async () => {
    render(page());
    expect(await screen.findByText('ĐỘI BÓNG · 1 KỶ LỤC')).toBeTruthy();
    const card = screen.getByText(viName('Leg Press')).closest('li')!;
    expect(card.textContent).toContain('100 kg × 8');
    expect(within(card).getByText('MỚI')).toBeTruthy();
  });
  it('invites you to set a record when there is no shadow yet', async () => {
    render(page({ loadHistory: async () => [{ date: '2026-10-14', sets: [set('Leg Press', 80)] }] }));
    expect(await screen.findByText(/Chưa có Bóng/)).toBeTruthy();
  });
  it('renders safely before the dashboard has loaded', () => {
    render(page({ dashboard: null }));
    expect(screen.getByText('Cấp 1')).toBeTruthy();
  });
  it('is reachable by #character and listed in the navigation', () => {
    window.location.hash = '#character';
    expect(tabFromHash()).toBe('character');
    window.location.hash = '#nonsense';
    expect(tabFromHash()).toBe('today');
    expect(primaryNav.map(n => n.id)).toEqual(['today', 'exercises', 'insights', 'character']);
  });
});
