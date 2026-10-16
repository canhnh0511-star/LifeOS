// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DailyDashboardDto, QuestDto } from '../api/types';
import { TodayPage } from './TodayPage';

afterEach(() => { cleanup(); localStorage.clear(); });

const quest = (id: string, status: QuestDto['status'], title = id): QuestDto => ({ habitId: id, goalId: 'g', goalTitle: 'G', title, targetMinutes: 30, xpReward: 20, category: 'HEALTH', date: '2026-10-16', status, completedAt: null, objectives: [] });
const dashboard = (quests: QuestDto[]): DailyDashboardDto => ({
  date: '2026-10-16', user: { id: 'u', displayName: 'C', email: 'c@x.co', timezone: 'Asia/Ho_Chi_Minh' }, quests,
  progress: { totalXp: 500, level: 2, levelStartXp: 400, nextLevelXp: 900, currentStreak: 3, longestStreak: 5, areas: [] },
  completedCount: quests.filter(q => q.status === 'COMPLETED').length, scheduledCount: quests.length, earnedXpToday: 20, journey: null, dailyRewards: [], dayStreak: 0
});
const props = { today: '2026-10-16', selectedDate: '2026-10-16', busyId: null, onSelectDate: () => {}, onNewHabit: () => {}, onSetObjective: () => {}, goTo: () => {} };

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
  it('shows the real chest states and how many quests remain for the next one', () => {
    const d = { ...dashboard([quest('a', 'COMPLETED'), quest('b', 'PENDING'), quest('c', 'PENDING'), quest('d', 'PENDING')]), dayStreak: 12,
      dailyRewards: [{ tier: 'WOOD' as const, threshold: 2, xp: 10, state: 'EARNED' as const, itemCode: null }, { tier: 'SILVER' as const, threshold: 4, xp: 20, state: 'LOCKED' as const, itemCode: null }, { tier: 'GOLD' as const, threshold: 4, xp: 40, state: 'LOCKED' as const, itemCode: null }] };
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={d}/>);
    const block = screen.getByLabelText('Phần thưởng hôm nay');
    expect(block.textContent).toContain('Còn 3 nhiệm vụ để mở Rương bạc');
    expect(screen.getByLabelText(/Rương gỗ: chạm để mở/)).toBeTruthy();
    expect(screen.getByLabelText(/Rương vàng: mở khi xong 4 nhiệm vụ/)).toBeTruthy();
    expect(screen.getByText('12').closest('.today-chip')!.textContent).toContain('ngày liên tục');
  });
  it('opens an earned chest with a reveal of what it paid, then remembers it was opened', async () => {
    localStorage.clear();
    const d = { ...dashboard([quest('a', 'COMPLETED'), quest('b', 'COMPLETED')]),
      dailyRewards: [{ tier: 'SILVER' as const, threshold: 1, xp: 20, state: 'EARNED' as const, itemCode: null }, { tier: 'GOLD' as const, threshold: 2, xp: 40, state: 'LOCKED' as const, itemCode: null }] };
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={d}/>);
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Rương bạc: chạm để mở/ }));
    const dialog = await screen.findByRole('dialog', { name: /Rương bạc/ });
    expect(await within(dialog).findByText('+20 XP', {}, { timeout: 3000 })).toBeTruthy();
    expect(dialog.textContent).toContain('+4'); // 20 XP split over the five areas
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Rương bạc: đã mở/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Rương vàng/ })).toBeNull(); // a locked chest is not a button
  });
  it('hints to open a ready chest even while another chest is still locked, and forgets a chest whose XP was taken back', async () => {
    const earned = { ...dashboard([quest('a', 'COMPLETED'), quest('b', 'PENDING')]), dailyRewards: [{ tier: 'WOOD' as const, threshold: 1, xp: 10, state: 'EARNED' as const, itemCode: null }, { tier: 'SILVER' as const, threshold: 2, xp: 20, state: 'LOCKED' as const, itemCode: null }] };
    const { rerender } = render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={earned}/>);
    expect(screen.getByLabelText('Phần thưởng hôm nay').textContent).toContain('Chạm vào rương để mở');
    await userEvent.click(screen.getByRole('button', { name: /Rương gỗ: chạm để mở/ }));
    const go = await screen.findByRole('button', { name: 'Tiếp tục' }) as HTMLButtonElement;
    await waitFor(() => expect(go.disabled).toBe(false), { timeout: 3000 });
    await userEvent.click(go);
    expect(screen.getByRole('button', { name: /Rương gỗ: đã mở/ })).toBeTruthy();
    const undone = { ...earned, dailyRewards: [{ tier: 'WOOD' as const, threshold: 1, xp: 10, state: 'LOCKED' as const, itemCode: null }, earned.dailyRewards[1]] };
    rerender(<TodayPage {...props} onToggleQuest={() => {}} dashboard={undone}/>);
    rerender(<TodayPage {...props} onToggleQuest={() => {}} dashboard={earned}/>);
    expect(screen.getByRole('button', { name: /Rương gỗ: chạm để mở/ })).toBeTruthy();
  });
  it('shows no reward block on a day without chests', () => {
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={dashboard([])}/>);
    expect(screen.queryByLabelText('Phần thưởng hôm nay')).toBeNull();
  });
  it('keeps the character stats off the page and links to them from the level chip', async () => {
    const goTo = vi.fn();
    render(<TodayPage {...props} goTo={goTo} onToggleQuest={() => {}} dashboard={dashboard([quest('a', 'PENDING')])}/>);
    expect(screen.queryByText('Chỉ số nhân vật')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Level 2, hạng E, xem nhân vật/ }));
    expect(goTo).toHaveBeenCalledWith('character');
  });
  it('shows a quest that has a checklist as a card with its lines, and offers a quick "all done" instead of a plain button', async () => {
    const onSetObjective = vi.fn(); const onToggleQuest = vi.fn();
    const withList: QuestDto = { ...quest('gym', 'PENDING', 'Tập chân'), objectives: [
      { id: 'o1', title: 'Squat', target: 40, unit: 'rep', step: 5, value: 10 }, { id: 'o2', title: 'Ghi lại', target: 1, unit: '', step: 1, value: 0 }] };
    render(<TodayPage {...props} onSetObjective={onSetObjective} onToggleQuest={onToggleQuest} dashboard={dashboard([withList])}/>);
    const next = screen.getByLabelText('Việc tiếp theo');
    expect(next.textContent).toContain('0/2 việc');
    expect(next.querySelectorAll('.objective')).toHaveLength(2);
    await userEvent.click(next.querySelector('button[aria-label^="Tăng Squat"]')!);
    expect(onSetObjective).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'gym' }), expect.objectContaining({ id: 'o1' }), 15);
    await userEvent.click(screen.getByRole('button', { name: /Đánh dấu xong tất cả/ }));
    expect(onToggleQuest).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'gym' }));
    expect(document.querySelector('.quests-panel .quest-card')).not.toBeNull();
    expect(document.querySelector('.quests-panel button.quest-row')).toBeNull();
  });
});

