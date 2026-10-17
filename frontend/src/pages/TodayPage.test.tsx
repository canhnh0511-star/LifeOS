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
    await userEvent.click(within(next).getByRole('button', { name: /^Hoàn thành$/ }));
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
    expect(screen.getByText('12 ngày').closest('.today-tile')!.textContent).toContain('Chuỗi ngày');
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
    await userEvent.click(screen.getByRole('button', { name: /Cấp 2, hạng E, Tân binh, xem nhân vật/ }));
    expect(goTo).toHaveBeenCalledWith('character');
  });
  it('keeps a checklist out of Today: the Main Quest shows only progress, and the lines live in the detail sheet', async () => {
    const onSetObjective = vi.fn(); const onToggleQuest = vi.fn();
    const withList: QuestDto = { ...quest('gym', 'PENDING', 'Tập chân'), objectives: [
      { id: 'o1', title: 'Squat', target: 40, unit: 'rep', step: 5, value: 10 }, { id: 'o2', title: 'Ghi lại', target: 1, unit: '', step: 1, value: 0 }] };
    render(<TodayPage {...props} onSetObjective={onSetObjective} onToggleQuest={onToggleQuest} dashboard={dashboard([withList])}/>);
    const next = screen.getByLabelText('Việc tiếp theo');
    expect(next.textContent).toContain('0/2 việc');
    expect(document.querySelectorAll('.objective')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Đánh dấu xong tất cả/ })).toBeNull();
    expect(document.querySelector('.quests-panel .quest-card')).not.toBeNull();
    expect(document.querySelector('.quests-panel button.quest-row')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu buổi tập|Mở danh sách việc|Xem chi tiết/ }));
    const sheet = screen.getByRole('region', { name: 'Tập chân' });
    expect(sheet.querySelectorAll('.objective')).toHaveLength(2);
    await userEvent.click(sheet.querySelector('button[aria-label^="Tăng Squat"]')!);
    expect(onSetObjective).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'gym' }), expect.objectContaining({ id: 'o1' }), 15);
    expect(onToggleQuest).not.toHaveBeenCalled();
  });
  it('names the first unfinished quest as the one Main Quest, shows difficulty from XP, and lists the quest once with a tag', () => {
    const hard = { ...quest('b', 'PENDING', 'Ngực + Tay sau'), xpReward: 50 };
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={dashboard([quest('a', 'COMPLETED'), hard, quest('c', 'PENDING')])}/>);
    const main = screen.getByLabelText('Việc tiếp theo');
    expect(main.textContent).toContain('VIỆC CHÍNH HÔM NAY');
    expect(main.textContent).toContain('Khó');
    expect(screen.getAllByText('Trọng tâm')).toHaveLength(1);
    expect(screen.getAllByText('Ngực + Tay sau')).toHaveLength(2); // featured card + its single list row; XP is claimed through one action
    expect(document.querySelectorAll('.quest-row .main-tag, .quest-card .main-tag')).toHaveLength(1);
  });
  it('keeps the level bar inside 0-100% at the level boundaries', () => {
    const d = dashboard([quest('a', 'PENDING')]);
    d.progress = { ...d.progress, totalXp: 1000, levelStartXp: 400, nextLevelXp: 900 };
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={d}/>);
    const widths = Array.from(document.querySelectorAll<HTMLElement>('.progress-fill')).map(f => parseFloat(f.style.width));
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every(w => w >= 0 && w <= 100)).toBe(true);
  });
  it('opens the quest detail from the Main Quest card and closes it without touching the quest', async () => {
    const onToggleQuest = vi.fn();
    render(<TodayPage {...props} onToggleQuest={onToggleQuest} dashboard={dashboard([quest('b', 'PENDING', 'Tập chân')])}/>);
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu buổi tập|Mở danh sách việc|Xem chi tiết/ }));
    const dialog = screen.getByRole('region', { name: 'Tập chân' });
    expect(within(dialog).getByRole('button', { name: 'Xác nhận hoàn thành' })).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thu gọn' }));
    expect(screen.queryByRole('region', { name: 'Tập chân' })).toBeNull(); expect(onToggleQuest).not.toHaveBeenCalled();
  });
  it('opens the detail from any quest row without completing it, and flags a timer that is still running', async () => {
    const onToggleQuest = vi.fn();
    localStorage.setItem('lifeos.timer.a:2026-10-16', JSON.stringify({ startedAt: Date.now() - 5000, accumulatedMs: 0 }));
    render(<TodayPage {...props} onToggleQuest={onToggleQuest} dashboard={dashboard([quest('a', 'PENDING', 'Vai'), quest('b', 'PENDING', 'Lưng')])}/>);
    expect(screen.getByRole('status').textContent).toContain('Đồng hồ buổi tập đang chạy');
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Lưng' }));
    expect(screen.getByRole('region', { name: 'Lưng' })).toBeTruthy();
    expect(onToggleQuest).not.toHaveBeenCalled();
  });
  it('pins another quest as Main from its detail, keeps it single, remembers it, and lists finished quests last', async () => {
    const d = dashboard([quest('a', 'COMPLETED', 'Xong rồi'), quest('b', 'PENDING', 'Vai'), quest('c', 'PENDING', 'Lưng')]);
    const { unmount } = render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={d}/>);
    const titles = () => Array.from(document.querySelectorAll('.quests-panel .quest-body strong')).map(e => e.textContent);
    expect(titles()).toEqual(['Vai', 'Lưng', 'Xong rồi']);
    expect(screen.getByLabelText('Việc tiếp theo').textContent).toContain('Vai');
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Lưng' }));
    await userEvent.click(screen.getByRole('button', { name: /Đặt làm nhiệm vụ trọng tâm/ }));
    await userEvent.click(within(screen.getByRole('region', { name: 'Lưng' })).getByRole('button', { name: 'Thu gọn' }));
    expect(screen.getByLabelText('Việc tiếp theo').textContent).toContain('Lưng');
    expect(screen.getAllByText('Trọng tâm')).toHaveLength(1);
    unmount();
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={d}/>); // a reload keeps the pin
    expect(screen.getByLabelText('Việc tiếp theo').textContent).toContain('Lưng');
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Lưng' }));
    await userEvent.click(screen.getByRole('button', { name: /Bỏ ghim/ }));
    await userEvent.click(within(screen.getByRole('region', { name: 'Lưng' })).getByRole('button', { name: 'Thu gọn' }));
    expect(screen.getByLabelText('Việc tiếp theo').textContent).toContain('Vai');
  });
});


describe('Today as a status window (B-35)', () => {
  it('shows level, rank stage and XP in the level, the day tiles and one quick stat per area', () => {
    const d = dashboard([quest('a', 'PENDING')]);
    d.progress = { ...d.progress, level: 12, totalXp: 1250, levelStartXp: 1000, nextLevelXp: 2000, areas: [
      { category: 'HEALTH', xp: 500, level: 6, levelStartXp: 0, nextLevelXp: 700 }, { category: 'CAREER', xp: 100, level: 2, levelStartXp: 0, nextLevelXp: 400 }] };
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={d} weekly={{ completedCount: 9, scheduledCount: 12 } as never}/>);
    const status = screen.getByLabelText('Trạng thái nhân vật');
    expect(status.textContent).toContain('Cấp 12'); expect(status.textContent).toContain('Hạng C · Tiên phong'); expect(status.textContent).toContain('1.250 / 2.000 XP');
    expect(screen.getByLabelText('Tóm tắt hôm nay').textContent).toContain('9/12');
    const stats = screen.getByLabelText('Chỉ số nhanh');
    expect(stats.querySelectorAll('li')).toHaveLength(2); expect(stats.textContent).toContain('6');
  });
  it('the main quest card carries its XP and a Start button that opens the detail, not a completion', async () => {
    const onToggleQuest = vi.fn();
    render(<TodayPage {...props} onToggleQuest={onToggleQuest} dashboard={dashboard([{ ...quest('b', 'PENDING', 'Buổi A'), xpReward: 40 }])}/>);
    const card = screen.getByLabelText('Việc tiếp theo');
    expect(card.textContent).toContain('+40 XP'); expect(card.textContent).toContain('VIỆC CHÍNH HÔM NAY');
    await userEvent.click(within(card).getByRole('button', { name: /Bắt đầu buổi tập|Mở danh sách việc|Xem chi tiết/ }));
    expect(screen.getByRole('region', { name: 'Buổi A' })).toBeTruthy();
    expect(onToggleQuest).not.toHaveBeenCalled();
  });
});

describe('Main Quest start button for a gym session', () => {
  it('goes straight into the set-by-set screen, and opens the plain detail for other quests', async () => {
    const gym = { ...quest('g', 'PENDING', 'Buổi A'), objectives: [{ id: 'o', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto;
    const setLog = { list: async () => [], record: async () => [], remove: async () => [], last: async () => ({ date: null, sets: [] }) };
    render(<TodayPage {...props} setLog={setLog} onToggleQuest={() => {}} dashboard={dashboard([gym])}/>);
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu buổi tập|Mở danh sách việc|Xem chi tiết/ }));
    expect(await screen.findByRole('button', { name: 'Hoàn thành set' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
    expect(screen.getByRole('button', { name: /Xác nhận hoàn thành/ })).toBeTruthy();
    cleanup();
    render(<TodayPage {...props} setLog={setLog} onToggleQuest={() => {}} dashboard={dashboard([quest('b', 'PENDING', 'Piano')])}/>);
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu buổi tập|Mở danh sách việc|Xem chi tiết/ }));
    expect(screen.queryByRole('button', { name: 'Hoàn thành set' })).toBeNull();
    expect(screen.getByRole('button', { name: /Xác nhận hoàn thành/ })).toBeTruthy();
  });
});

describe('quest detail and workout open in place (no popup)', () => {
  const gym = { ...quest('g', 'PENDING', 'Buổi A'), objectives: [{ id: 'o', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto;
  const setLog = { list: async () => [], record: async () => [], remove: async () => [], last: async () => ({ date: null, sets: [] }) };
  it('opens the workout right under the main quest card, with no dialog, and Escape collapses it', async () => {
    render(<TodayPage {...props} setLog={setLog} onToggleQuest={() => {}} dashboard={dashboard([gym])}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu buổi tập' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const panel = await screen.findByRole('region', { name: 'Đang tập · Buổi A' });
    expect(screen.getByLabelText('Việc tiếp theo').compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hoàn thành set' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: /Đang tập/ })).toBeNull();
    expect(screen.getByLabelText('Việc tiếp theo')).toBeTruthy(); // Today is still there
  });
  it('opens a non-main quest right below its own row', async () => {
    render(<TodayPage {...props} onToggleQuest={() => {}} dashboard={dashboard([quest('a', 'PENDING', 'Vai'), quest('b', 'PENDING', 'Lưng')])}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Lưng' }));
    const panel = screen.getByRole('region', { name: 'Lưng' });
    const row = screen.getByRole('button', { name: 'Chi tiết Lưng' }).closest('.quest-row-wrap')!;
    expect(row.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.nextElementSibling).toBe(panel);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Phase 1: the first screen is about training', () => {
  const gym = { ...quest('g', 'PENDING', 'Buổi A'), objectives: [{ id: 'o', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto;
  const logWith = (n: number) => ({ list: async () => Array.from({ length: n }, (_, i) => ({ exercise: 'Machine Chest Press', setNo: i + 1, reps: 10, weightKg: null })), record: async () => [], remove: async () => [], last: async () => ({ date: null, sets: [] }) });
  it('puts "Tạo lịch tập mẫu" above the other quests when there is no gym plan', () => {
    render(<TodayPage {...props} onImportPlan={() => {}} habits={[]} onToggleQuest={() => {}} dashboard={dashboard([quest('w', 'PENDING', 'Uống nước')])}/>);
    const cta = screen.getByRole('button', { name: 'Tạo lịch tập mẫu' });
    const quests = screen.getByLabelText('Việc tiếp theo');
    expect(cta.compareDocumentPosition(quests) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('offers to continue a session that already has logged sets', async () => {
    render(<TodayPage {...props} setLog={logWith(2)} onToggleQuest={() => {}} dashboard={dashboard([gym])}/>);
    expect(await screen.findByRole('button', { name: 'Tiếp tục buổi tập · đã ghi 2 set' })).toBeTruthy();
  });
  it('keeps "Bắt đầu buổi tập" while nothing has been logged', async () => {
    render(<TodayPage {...props} setLog={logWith(0)} onToggleQuest={() => {}} dashboard={dashboard([gym])}/>);
    expect(await screen.findByRole('button', { name: 'Bắt đầu buổi tập' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Tiếp tục buổi tập/ })).toBeNull();
  });
});

describe('gym nudge on Today', () => {
  const habit = (over: Partial<import('../api/types').HabitDto> = {}) => ({ id: 'a', goalId: 'g', title: 'Buổi A', targetMinutes: 45, xpReward: 40, weekdays: [1], startDate: '2026-10-12', endDate: null, status: 'ACTIVE', objectives: [{ id: 'o', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10 }], ...over }) as import('../api/types').HabitDto;
  it('offers to load a gym plan when there is none', async () => {
    const onImportPlan = vi.fn();
    render(<TodayPage {...props} onImportPlan={onImportPlan} habits={[]} onToggleQuest={() => {}} dashboard={dashboard([quest('w', 'PENDING', 'Uống nước')])}/>);
    await userEvent.click(within(screen.getByLabelText('Giáo án gym')).getByRole('button', { name: 'Tạo lịch tập mẫu' }));
    expect(onImportPlan).toHaveBeenCalled();
  });
  it('says when the next session is when today has none (2026-10-16 is a Friday, the session is on Monday)', () => {
    render(<TodayPage {...props} onImportPlan={() => {}} habits={[habit()]} onToggleQuest={() => {}} dashboard={dashboard([quest('w', 'PENDING', 'Uống nước')])}/>);
    const card = screen.getByLabelText('Buổi tập kế tiếp');
    expect(card.textContent).toContain('Buổi A'); expect(card.textContent).toContain('Ngực');
  });
  it('shows no nudge when a gym session is on today, on a past day, or while the habits are unknown', () => {
    const gym = { ...quest('g', 'PENDING', 'Buổi A'), objectives: [{ id: 'o', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto;
    const { rerender } = render(<TodayPage {...props} onImportPlan={() => {}} habits={[habit()]} onToggleQuest={() => {}} dashboard={dashboard([gym])}/>);
    expect(screen.queryByLabelText('Buổi tập kế tiếp')).toBeNull(); expect(screen.queryByLabelText('Giáo án gym')).toBeNull();
    rerender(<TodayPage {...props} selectedDate="2026-10-15" onImportPlan={() => {}} habits={[]} onToggleQuest={() => {}} dashboard={dashboard([quest('w', 'PENDING')])}/>);
    expect(screen.queryByLabelText('Giáo án gym')).toBeNull();
    rerender(<TodayPage {...props} onImportPlan={() => {}} onToggleQuest={() => {}} dashboard={dashboard([quest('w', 'PENDING')])}/>);
    expect(screen.queryByLabelText('Giáo án gym')).toBeNull();
  });
});
