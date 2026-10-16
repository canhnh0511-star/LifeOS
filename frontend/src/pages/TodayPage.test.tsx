// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DailyDashboardDto, QuestDto } from '../api/types';
import { TodayPage } from './TodayPage';

afterEach(cleanup);

const quest = (id: string, status: QuestDto['status'], title = id): QuestDto => ({ habitId: id, goalId: 'g', goalTitle: 'G', title, targetMinutes: 30, xpReward: 20, category: 'HEALTH', date: '2026-10-16', status, completedAt: null });
const dashboard = (quests: QuestDto[]): DailyDashboardDto => ({
  date: '2026-10-16', user: { id: 'u', displayName: 'C', email: 'c@x.co', timezone: 'Asia/Ho_Chi_Minh' }, quests,
  progress: { totalXp: 500, level: 2, levelStartXp: 400, nextLevelXp: 900, currentStreak: 3, longestStreak: 5, areas: [] },
  completedCount: quests.filter(q => q.status === 'COMPLETED').length, scheduledCount: quests.length, earnedXpToday: 20, journey: null
});
const props = { today: '2026-10-16', selectedDate: '2026-10-16', busyId: null, onSelectDate: () => {}, onNewHabit: () => {}, goTo: () => {} };

describe('TodayPage', () => {
  it('puts the first unfinished quest up front with one button, and completing it calls the handler with that quest', async () => {
    const onToggleQuest = vi.fn();
    render(<TodayPage {...props} dashboard={dashboard([quest('a', 'COMPLETED', 'Đã xong'), quest('b', 'PENDING', 'Việc kế tiếp'), quest('c', 'PENDING', 'Việc sau')])} onToggleQuest={onToggleQuest}/>);
    const next = screen.getByLabelText('Việc tiếp theo');
    expect(next.textContent).toContain('Việc kế tiếp');
    expect(next.textContent).not.toContain('Việc sau');
    await userEvent.click(next.querySelector('button')!);
    expect(onToggleQuest).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'b' }));
  });
  it('says everything is done, and offers the character tab', async () => {
    const goTo = vi.fn();
    render(<TodayPage {...props} goTo={goTo} onToggleQuest={() => {}} dashboard={dashboard([quest('a', 'COMPLETED'), quest('b', 'COMPLETED')])}/>);
    expect(screen.queryByLabelText('Việc tiếp theo')).toBeNull();
    expect(screen.getByLabelText('Đã xong hôm nay')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Xem nhân vật' }));
    expect(goTo).toHaveBeenCalledWith('character');
  });
  it('shows no "next" card for a past day or when nothing is scheduled', () => {
    const { rerender } = render(<TodayPage {...props} selectedDate="2026-10-15" onToggleQuest={() => {}} dashboard={dashboard([quest('a', 'PENDING')])}/>);
    expect(screen.queryByLabelText('Việc tiếp theo')).toBeNull();
    rerender(<TodayPage {...props} onToggleQuest={() => {}} dashboard={dashboard([])}/>);
    expect(screen.queryByLabelText('Việc tiếp theo')).toBeNull();
    expect(screen.queryByLabelText('Đã xong hôm nay')).toBeNull();
    expect(screen.getByText('Không có nhiệm vụ trong ngày này')).toBeTruthy();
  });
  it('keeps the character stats off the page and links to them from the level chip', async () => {
    const goTo = vi.fn();
    render(<TodayPage {...props} goTo={goTo} onToggleQuest={() => {}} dashboard={dashboard([quest('a', 'PENDING')])}/>);
    expect(screen.queryByText('Chỉ số nhân vật')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Level 2, xem nhân vật/ }));
    expect(goTo).toHaveBeenCalledWith('character');
  });
});
