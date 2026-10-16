// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { DailyDashboardDto } from '../api/types';
import { ALL_CATEGORIES } from '../domain/insights';
import { primaryNav, tabFromHash } from '../ui/nav';
import { CharacterPage } from './CharacterPage';

afterEach(() => { cleanup(); window.location.hash = ''; });

const dashboard: DailyDashboardDto = {
  date: '2026-10-15', user: { id: 'u', displayName: 'C', email: 'c@x.co', timezone: 'Asia/Ho_Chi_Minh' }, quests: [],
  progress: { totalXp: 1000, level: 3, levelStartXp: 900, nextLevelXp: 1600, currentStreak: 4, longestStreak: 9, areas: ALL_CATEGORIES.map(category => ({ category, xp: 200, level: 1, levelStartXp: 0, nextLevelXp: 400 })) },
  completedCount: 0, scheduledCount: 3, earnedXpToday: 77, journey: null
};

describe('CharacterPage and the Nhân vật tab', () => {
  it('shows level, the figure and the stat list, and only numbers that do not depend on the selected day', () => {
    render(<CharacterPage dashboard={dashboard}/>);
    expect(screen.getByText(/Level 3/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Chỉ số nhân vật' })).toBeTruthy();
    expect(screen.getByText('Chuỗi hiện tại').parentElement!.textContent).toContain('4');
    expect(screen.getByText('Chuỗi kỷ lục').parentElement!.textContent).toContain('9');
    expect(screen.queryByText(/hôm nay/i)).toBeNull();        // a past day selected on Today must not leak in as "today"
    expect(document.body.textContent).not.toContain('77');
  });
  it('renders safely before the dashboard has loaded', () => {
    render(<CharacterPage dashboard={null}/>);
    expect(screen.getByText(/Level 1/)).toBeTruthy();
  });
  it('is reachable by #character and listed in the navigation', () => {
    window.location.hash = '#character';
    expect(tabFromHash()).toBe('character');
    window.location.hash = '#nonsense';
    expect(tabFromHash()).toBe('today');
    expect(primaryNav.map(n => n.id)).toEqual(['today', 'journey', 'character', 'insights']);
  });
});
