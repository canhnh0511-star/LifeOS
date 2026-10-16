// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QuestDto, QuestObjectiveDto } from '../api/types';
import { ObjectiveList, isTick, metCount } from './ObjectiveList';

afterEach(cleanup);

const line = (over: Partial<QuestObjectiveDto> = {}): QuestObjectiveDto => ({ id: 'o1', title: 'Squat', target: 40, unit: 'rep', step: 5, value: 10, ...over });
const quest = (objectives: QuestObjectiveDto[]): QuestDto => ({ habitId: 'h', goalId: 'g', goalTitle: 'G', title: 'Tập chân', targetMinutes: 45, xpReward: 30, category: 'HEALTH', date: '2026-10-16', status: 'PENDING', completedAt: null, objectives });

describe('ObjectiveList', () => {
  it('shows the progress and sends an absolute value for + and -, updating the number at once', async () => {
    const onSet = vi.fn();
    render(<ObjectiveList quest={quest([line()])} onSet={onSet}/>);
    expect(screen.getByText('10').textContent).toBe('10');
    await userEvent.click(screen.getByRole('button', { name: /Tăng Squat 5 rep/ }));
    expect(onSet).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'o1' }), 15);
    await userEvent.click(screen.getByRole('button', { name: /Tăng Squat/ }));
    expect(onSet).toHaveBeenLastCalledWith(expect.anything(), 20);       // two quick taps are not lost: the second builds on the first
    await userEvent.click(screen.getByRole('button', { name: /Giảm Squat/ }));
    expect(onSet).toHaveBeenLastCalledWith(expect.anything(), 15);
  });
  it('does not go below zero, lands exactly on the target, and may go past it only from there', async () => {
    const onSet = vi.fn();
    const { rerender } = render(<ObjectiveList quest={quest([line({ value: 0 })])} onSet={onSet}/>);
    expect((screen.getByRole('button', { name: /Giảm Squat/ }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<ObjectiveList quest={quest([line({ value: 38 })])} onSet={onSet}/>);
    await userEvent.click(screen.getByRole('button', { name: /Tăng Squat/ }));
    expect(onSet).toHaveBeenLastCalledWith(expect.anything(), 40);
    rerender(<ObjectiveList quest={quest([line({ value: 40 })])} onSet={onSet}/>);
    await userEvent.click(screen.getByRole('button', { name: /Tăng Squat/ }));
    expect(onSet).toHaveBeenLastCalledWith(expect.anything(), 45);
  });
  it('commits a typed number when the field loses focus or Enter is pressed, and ignores an unchanged one', async () => {
    const onSet = vi.fn();
    render(<ObjectiveList quest={quest([line({ value: 10 })])} onSet={onSet}/>);
    const input = screen.getByLabelText('Nhập tiến độ Squat') as HTMLInputElement;
    await userEvent.clear(input); await userEvent.type(input, '33{Enter}');
    expect(onSet).toHaveBeenCalledWith(expect.anything(), 33);
    onSet.mockClear();
    const again = screen.getByLabelText('Nhập tiến độ Squat') as HTMLInputElement;
    await userEvent.click(again); await userEvent.tab();
    expect(onSet).not.toHaveBeenCalled();
  });
  it('treats a line with target 1 and no unit as a tick box', async () => {
    const onSet = vi.fn();
    const tick = line({ id: 't', title: 'Ghi lại bữa ăn', target: 1, unit: '', step: 1, value: 0 });
    expect(isTick(tick)).toBe(true);
    render(<ObjectiveList quest={quest([tick])} onSet={onSet}/>);
    const box = screen.getByRole('checkbox', { name: /Ghi lại bữa ăn/ });
    expect(box.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(box);
    expect(onSet).toHaveBeenCalledWith(expect.objectContaining({ id: 't' }), 1);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });
  it('goes back to the server numbers when fresh data arrives, and counts met lines', () => {
    const onSet = vi.fn();
    const first = [line({ value: 10 })];
    const { rerender } = render(<ObjectiveList quest={quest(first)} onSet={onSet}/>);
    rerender(<ObjectiveList quest={quest([line({ value: 25 })])} onSet={onSet}/>);
    expect((screen.getByLabelText('Nhập tiến độ Squat') as HTMLInputElement).value).toBe('25');
    expect(metCount([line({ value: 40 }), line({ id: 'b', value: 3 }), line({ id: 'c', value: 41 })])).toBe(2);
  });
});
