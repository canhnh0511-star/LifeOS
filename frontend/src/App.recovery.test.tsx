// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { mockClient, resetDemoData, setDailyRewardsEnabled } from './api/mockClient';
import { todayInTimezone } from './domain/rules';

afterEach(cleanup);
beforeAll(() => { Element.prototype.scrollIntoView = () => {}; });

describe('Today: "Thêm ngày hồi phục"', () => {
  it('adds the recovery days to an older plan when the button is pressed', async () => {
    resetDemoData(); setDailyRewardsEnabled(false);
    const t = await mockClient.getPlan();
    await mockClient.importHabitPlan({ startDate: todayInTimezone(), goals: [{ title: t.title, category: 'HEALTH', description: t.description, habits: t.sessions.filter(s => s.title.startsWith('Buổi')).map(s => ({ title: s.title, targetMinutes: s.targetMinutes, xpReward: s.xpReward, weekdays: s.weekdays as never, objectives: s.objectives })) }] });
    render(<App/>);
    const button = await screen.findByRole('button', { name: 'Thêm ngày hồi phục' });
    await userEvent.click(button);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Thêm ngày hồi phục' })).toBeNull());
    expect((await mockClient.getHabits()).some(h => h.title === 'Đi bộ nhanh')).toBe(true);
  });
});
