// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuestDto } from '../api/types';
import { QuestSheet } from './QuestSheet';

afterEach(() => { cleanup(); localStorage.clear(); });
const quest = (status: QuestDto['status']): QuestDto => ({ habitId: 'h', goalId: 'g', goalTitle: 'G', title: 'Ngực + Tay sau', targetMinutes: 60, xpReward: 50, category: 'HEALTH', date: '2026-10-16', status, completedAt: null,
  objectives: [{ id: 'o1', title: 'Bench press', target: 12, unit: 'rep', step: 2, value: 4 }] } as QuestDto);
const setup = (status: QuestDto['status'] = 'PENDING') => {
  const onToggle = vi.fn(), onSetObjective = vi.fn(), onClose = vi.fn();
  render(<QuestSheet quest={quest(status)} date="2026-10-16" busy={false} onClose={onClose} onToggle={onToggle} onSetObjective={onSetObjective}/>);
  return { onToggle, onSetObjective, onClose };
};

describe('QuestSheet (RPG-03)', () => {
  it('starting, pausing and resetting the timers never completes the quest or sets progress', async () => {
    const { onToggle, onSetObjective } = setup();
    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }));
    expect(screen.getByRole('button', { name: /Tạm dừng/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Tạm dừng/ }));
    await userEvent.click(screen.getByRole('button', { name: /Đặt lại/ }));
    await userEvent.click(screen.getByRole('button', { name: '90 giây' }));
    expect(onToggle).not.toHaveBeenCalled(); expect(onSetObjective).not.toHaveBeenCalled();
  });
  it('completes only through the explicit confirm button, once per click', async () => {
    const { onToggle } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn thành' }));
    expect(onToggle).toHaveBeenCalledTimes(1); expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'h' }));
  });
  it('asks before undoing a finished quest, and keeping it does nothing', async () => {
    const { onToggle } = setup('COMPLETED');
    expect(screen.queryByRole('button', { name: 'Xác nhận hoàn thành' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Hoàn tác/ }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Xác nhận hoàn tác' }).textContent).toContain('50 XP');
    await userEvent.click(screen.getByRole('button', { name: 'Giữ nguyên' }));
    expect(onToggle).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Hoàn tác/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Hoàn tác$/, hidden: false }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
  it('sends checklist changes through the existing handler and restores a running timer after a reload', async () => {
    localStorage.setItem('lifeos.timer.h:2026-10-16', JSON.stringify({ startedAt: Date.now() - 125000, accumulatedMs: 0 }));
    const { onSetObjective } = setup();
    expect(screen.getByRole('button', { name: /Tạm dừng/ })).toBeTruthy();
    expect(screen.getAllByRole('timer')[0].textContent).toMatch(/0[2-3]:\d\d/);
    await userEvent.click(document.querySelector('button[aria-label^="Tăng Bench press"]')!);
    expect(onSetObjective).toHaveBeenCalledWith(expect.objectContaining({ habitId: 'h' }), expect.objectContaining({ id: 'o1' }), 6);
  });
  it('says when the rest is over and buzzes once, still without touching the quest', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const vibrate = vi.fn(); Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    try {
      const { onToggle, onSetObjective } = setup();
      await userEvent.click(screen.getByRole('button', { name: '60 giây' }));
      expect(screen.queryByText(/Hết giờ nghỉ/)).toBeNull();
      await act(async () => { await vi.advanceTimersByTimeAsync(61000); });
      expect(screen.getByText(/Hết giờ nghỉ/)).toBeTruthy();
      expect(vibrate).toHaveBeenCalledTimes(1);
      expect(onToggle).not.toHaveBeenCalled(); expect(onSetObjective).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
  it('offers the rest time the plan suggests for the next exercise, and starts only the countdown', async () => {
    const onToggle = vi.fn(), onSetObjective = vi.fn();
    const q = { ...quest('PENDING'), objectives: [
      { id: 'o1', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 20 },
      { id: 'o2', title: 'Seated Leg Curl', target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto;
    render(<QuestSheet quest={q} date="2026-10-16" busy={false} onClose={() => {}} onToggle={onToggle} onSetObjective={onSetObjective}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Nghỉ 75 giây · Seated Leg Curl' }));
    expect(screen.getAllByRole('timer').length).toBe(2);
    expect(onToggle).not.toHaveBeenCalled(); expect(onSetObjective).not.toHaveBeenCalled();
  });
  it('shows no suggested rest for a line the library does not know', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^Nghỉ \d+ giây ·/ })).toBeNull();
  });
});

describe('QuestSheet: rest follows the goal the plan was built for', () => {
  const gym = (goalTitle: string): QuestDto => ({ ...quest('PENDING'), goalTitle, objectives: [{ id: 'o1', title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10, value: 0 }] } as QuestDto);
  const rest = (goalTitle: string) => { render(<QuestSheet quest={gym(goalTitle)} date="2026-10-16" busy={false} onClose={() => {}} onToggle={() => {}} onSetObjective={() => {}}/>); return screen.getByRole('button', { name: /^Nghỉ \d+ giây/ }).textContent; };
  it('suggests the library rest for a plan with no known goal', () => { expect(rest('Tuần 1 quay lại')).toContain('Nghỉ 90 giây'); });
  it('suggests a short rest for fat loss, a long one for strength', () => {
    expect(rest('Gym — Giảm mỡ · Tại nhà · 3 buổi/tuần')).toContain('Nghỉ 45 giây');
    cleanup();
    expect(rest('Gym — Khỏe hơn · Phòng gym đủ máy · 3 buổi/tuần')).toContain('Nghỉ 150 giây');
  });
});

