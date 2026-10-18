// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HabitDto } from '../api/types';
import { EXERCISES } from '../domain/exerciseLibrary';
import { ExerciseLibrary, filterExercises } from './ExerciseLibrary';

afterEach(cleanup);

describe('filterExercises by Vietnamese and English names', () => {
  it('finds an exercise by its Vietnamese name with or without accents, and by its English name', () => {
    expect(filterExercises(EXERCISES, null, 'hít đất').map(e => e.id)).toEqual(['push-up']);
    expect(filterExercises(EXERCISES, null, 'hit dat').map(e => e.id)).toEqual(['push-up']);
    expect(filterExercises(EXERCISES, null, 'PUSH-UP').map(e => e.id)).toEqual(['push-up', 'pike-push-up']);   // the English name also matches the pike variant
    expect(filterExercises(EXERCISES, null, 'goblet').map(e => e.id)).toContain('goblet-squat');
  });
  it('lists the Vietnamese name first in the library', async () => {
    render(<ExerciseLibrary onClose={() => {}}/>);
    expect(screen.getByRole('button', { name: /Chi tiết Hít đất/ })).toBeTruthy();
  });
  it('shows a small picture in the list for exercises that have one, and keeps the muscle figure for those that do not', () => {
    render(<ExerciseLibrary onClose={() => {}}/>);
    expect(screen.getByRole('button', { name: /Chi tiết Hít đất/ }).querySelector('img')!.getAttribute('src')).toBe('/art/exercises/push-up.jpg');
    expect(screen.getByRole('button', { name: /Chi tiết Đẩy ngực với thanh đòn/ }).querySelector('img')).toBeNull();
  });
});

describe('filterExercises', () => {
  it('filters by group, and searches ignoring case and accents', () => {
    expect(filterExercises(EXERCISES, 'CORE', '').every(e => e.group === 'CORE')).toBe(true);
    expect(filterExercises(EXERCISES, null, 'PLANK').map(e => e.name)).toEqual(['Plank']);
    expect(filterExercises(EXERCISES, null, 'nguc').length).toBe(filterExercises(EXERCISES, 'CHEST', '').length + filterExercises(EXERCISES, null, 'nguc').filter(e => e.group !== 'CHEST').length);
    expect(filterExercises(EXERCISES, 'LEGS', 'bench')).toEqual([]);
  });
});

describe('exercise library screen (B-39)', () => {
  it('lists all exercises, filters by muscle group and by search, and says when nothing matches', async () => {
    render(<ExerciseLibrary onClose={() => {}}/>);
    expect(screen.getByRole('status').textContent).toBe(`${EXERCISES.length} bài`);
    await userEvent.click(screen.getByRole('button', { name: /^Bụng/ }));
    expect(screen.getByRole('button', { name: 'Chi tiết Plank (giữ thân thẳng)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Chi tiết Đẩy ngực với thanh đòn (ghế phẳng)' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Tìm bài tập'), 'zzz');
    expect(screen.getByText(/Không có bài nào khớp/)).toBeTruthy();
  });
  it('opens an exercise for its detail and goes back to the list', async () => {
    render(<ExerciseLibrary onClose={() => {}}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Plank (giữ thân thẳng)' }));
    expect(screen.getByRole('region', { name: 'Chi tiết Plank (giữ thân thẳng)' })).toBeTruthy(); // in place, under its row
    expect(screen.getByText('Nhóm cơ chính')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Chuẩn bị' })); expect(screen.getByText(/khuỷu ngay dưới vai/i)).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1); // only the library itself
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn' }));
    expect(screen.queryByRole('region', { name: /Chi tiết Plank/ })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Thư viện bài tập' })).toBeTruthy();
  });
});

describe('add an exercise to a session (B-39)', () => {
  const habit = (id: string, title: string, names: string[]) => ({ id, goalId: 'g', title, targetMinutes: 45, xpReward: 40, weekdays: [1], startDate: '2026-10-19', endDate: null, status: 'ACTIVE', objectives: names.map((n, i) => ({ id: `${id}${i}`, title: n, target: 20, unit: 'rep', step: 10 })) }) as HabitDto;
  it('appends the exercise to the chosen gym session, keeping its current lines', async () => {
    const onAdd = vi.fn(async () => {});
    render(<ExerciseLibrary onClose={() => {}} habits={[habit('a', 'Buổi A', ['Machine Chest Press']), habit('p', 'Piano', ['Scales'])]} onAddToHabit={onAdd}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Plank (giữ thân thẳng)' }));
    expect(screen.queryByRole('option', { name: 'Piano' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Thêm 3×45 giây/ }));
    expect(onAdd).toHaveBeenCalledWith('a', [{ title: 'Machine Chest Press', target: 20, unit: 'rep', step: 10 }, { title: 'Plank', target: 135, unit: 'giây', step: 45 }]);
    expect(await screen.findByText(/Đã thêm vào Buổi A\. .*từ ngày mai/)).toBeTruthy();
  });
  it('refuses a duplicate and shows an API failure', async () => {
    const onAdd = vi.fn(async () => { throw new Error('Không lưu được.'); });
    render(<ExerciseLibrary onClose={() => {}} habits={[habit('a', 'Buổi A', ['Machine Chest Press'])]} onAddToHabit={onAdd}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Đẩy ngực với máy' }));
    await userEvent.click(screen.getByRole('button', { name: /^Thêm/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('đã có bài này'); expect(onAdd).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Plank (giữ thân thẳng)' }));
    await userEvent.click(screen.getByRole('button', { name: /^Thêm/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('Không lưu được');
  });
  it('says there is no session when no habit is a gym session', async () => {
    render(<ExerciseLibrary onClose={() => {}} habits={[habit('p', 'Piano', ['Scales'])]} onAddToHabit={async () => {}}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Plank (giữ thân thẳng)' }));
    expect(screen.getByText(/Chưa có buổi tập nào/)).toBeTruthy();
  });
});
