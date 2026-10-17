// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanImportForm } from './PlanImportForm';
import { PROGRAMS, planRequest } from '../domain/exerciseLibrary';
import { mockClient } from '../api/mockClient';

afterEach(() => { cleanup(); localStorage.clear(); });

describe('PlanImportForm (B-32)', () => {
  it('shows what the program creates and sends nothing until the confirm button', async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<PlanImportForm onClose={() => {}} onImport={onImport}/>);
    const preview = screen.getByLabelText('Xem trước giáo án');
    expect(preview.textContent).toContain('Machine Chest Press · 2×10');
    expect(preview.textContent).toContain('Dead Bug · 2×8 mỗi bên');
    expect(preview.textContent).toContain('3 thói quen');
    await userEvent.click(screen.getByRole('radio', { name: /Chia nhóm cơ — 5 buổi/ }));
    expect(preview.textContent).toContain('5 thói quen');
    expect(preview.textContent).toContain('Plank · 3×45 giây');
    expect(onImport).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Nạp giáo án/ }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0]).toMatchObject({ goals: [{ title: 'Gym — Chia nhóm cơ — 5 buổi', category: 'HEALTH' }] });
  });
  it('cancel closes without importing', async () => {
    const onImport = vi.fn(), onClose = vi.fn();
    render(<PlanImportForm onClose={onClose} onImport={onImport}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });
});

describe.each(PROGRAMS)('importing $name into the mock API', program => {
  it('is accepted, creates scheduled habits with set-sized checklists, and refuses a second import', async () => {
    localStorage.clear();
    const start = '2026-10-19';
    const out = await mockClient.importHabitPlan(planRequest(program, start));
    expect(out.habits).toHaveLength(program.days.length);
    expect(out.habits[0].objectives[0]).toEqual(expect.objectContaining({ title: expect.any(String), step: expect.any(Number) }));
    await expect(mockClient.importHabitPlan(planRequest(program, start))).rejects.toMatchObject({ status: 409 });
  });
});
