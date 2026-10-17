// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DailyDashboardDto, QuestDto } from '../api/types';
import { WeekPlan } from './WeekPlan';

afterEach(() => { cleanup(); localStorage.clear(); });
const quest = (habitId: string, title: string, status: 'PENDING' | 'COMPLETED' = 'PENDING') => ({ habitId, title, targetMinutes: 45, status, xpReward: 40, category: 'HEALTH', objectives: [] }) as unknown as QuestDto;
const day = (quests: QuestDto[]) => ({ quests, scheduledCount: quests.length, completedCount: quests.filter(q => q.status === 'COMPLETED').length }) as unknown as DailyDashboardDto;
// 2026-10-21 is a Wednesday; the week is 19..25 October.
const load = vi.fn(async (d: string) => d === '2026-10-19' ? day([quest('a', 'Buổi A', 'COMPLETED')]) : d === '2026-10-21' ? day([quest('b', 'Buổi B')]) : day([]));
const open = (onPick = vi.fn()) => { render(<WeekPlan today="2026-10-21" selectedDate="2026-10-21" loadDay={load} onPick={onPick} onClose={() => {}}/>); return onPick; };

describe('week plan (B-36)', () => {
  it('shows Monday to Sunday with sessions, rest days, the Main Quest and the week total', async () => {
    open();
    const mon = screen.getByLabelText('T2 19/10'), wed = screen.getByLabelText('T4 21/10, hôm nay');
    expect(await within(mon).findByText('Buổi A')).toBeTruthy();
    expect(await within(wed).findByText('Main Quest')).toBeTruthy();
    expect(await within(screen.getByLabelText('T3 20/10')).findByText(/Nghỉ/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/1\/2 nhiệm vụ/)).toBeTruthy());
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(7);
  });
  it('previews future days without an open button, and picks a past day or today', async () => {
    const onPick = open();
    await screen.findByText('Buổi A');
    expect(within(screen.getByLabelText('T5 22/10')).queryByRole('button', { name: /Mở/ })).toBeNull();
    expect(within(screen.getByLabelText('T5 22/10')).getByText('Xem trước')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Mở T2 19/10' }));
    expect(onPick).toHaveBeenCalledWith('2026-10-19');
  });
  it('moves between weeks and reports a day that fails to load', async () => {
    load.mockRejectedValueOnce(new Error('x'));
    open();
    expect((await screen.findAllByRole('alert')).length).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: 'Tuần trước' }));
    expect(await screen.findByLabelText('T2 12/10')).toBeTruthy();
    expect(load).toHaveBeenCalledWith('2026-10-12');
  });
});
