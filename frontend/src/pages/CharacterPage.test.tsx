// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DailyDashboardDto } from '../api/types';
import { ALL_CATEGORIES } from '../domain/insights';
import { primaryNav, tabFromHash } from '../ui/nav';
import { CharacterPage } from './CharacterPage';

afterEach(() => { cleanup(); window.location.hash = ''; });

const dashboard: DailyDashboardDto = {
  date: '2026-10-15', user: { id: 'u', displayName: 'C', email: 'c@x.co', timezone: 'Asia/Ho_Chi_Minh' }, quests: [],
  progress: { totalXp: 1000, level: 3, levelStartXp: 900, nextLevelXp: 1600, currentStreak: 4, longestStreak: 9, areas: ALL_CATEGORIES.map(category => ({ category, xp: 200, level: 1, levelStartXp: 0, nextLevelXp: 400 })) },
  completedCount: 0, scheduledCount: 3, earnedXpToday: 77, journey: null, dailyRewards: [], dayStreak: 0
};

describe('CharacterPage and the Nhân vật tab', () => {
  it('shows level, the figure and the stat list, and only numbers that do not depend on the selected day', () => {
    render(<CharacterPage dashboard={dashboard} items={[]} busyItemCode={null} onEquip={() => {}} onUnequip={() => {}}/>);
    expect(screen.getByText(/Level 3/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Chỉ số nhân vật' })).toBeTruthy();
    expect(screen.getByText('Chuỗi hiện tại').parentElement!.textContent).toContain('4');
    expect(screen.getByText('Chuỗi kỷ lục').parentElement!.textContent).toContain('9');
    expect(screen.queryByText(/hôm nay/i)).toBeNull();        // a past day selected on Today must not leak in as "today"
    expect(document.body.textContent).not.toContain('77');
  });
  it('shows the portrait for the current rank and opens the rank gallery in place', async () => {
    render(<CharacterPage dashboard={dashboard} items={[]} busyItemCode={null} onEquip={() => {}} onUnequip={() => {}}/>);
    expect(screen.getByRole('img', { name: /Hạng E: gầy, mệt mỏi/ })).toBeTruthy();   // level 3 = rank E
    expect(screen.queryByRole('list', { name: 'Diện mạo theo hạng' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Diện mạo theo hạng/ }));
    const gallery = screen.getByRole('region', { name: 'Diện mạo theo hạng' });          // inline, not a dialog
    expect(within(gallery).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(within(gallery).getByRole('button', { name: /Thu gọn/ }));
    expect(screen.queryByRole('region', { name: 'Diện mạo theo hạng' })).toBeNull();
  });
  it('renders safely before the dashboard has loaded', () => {
    render(<CharacterPage dashboard={null} items={[]} busyItemCode={null} onEquip={() => {}} onUnequip={() => {}}/>);
    expect(screen.getByText(/Level 1/)).toBeTruthy();
  });
  it('is reachable by #character and listed in the navigation', () => {
    window.location.hash = '#character';
    expect(tabFromHash()).toBe('character');
    window.location.hash = '#nonsense';
    expect(tabFromHash()).toBe('today');
    expect(primaryNav.map(n => n.id)).toEqual(['today', 'exercises', 'insights', 'character']); // gym v1: four destinations (see ui/nav.test.ts)
  });
});
