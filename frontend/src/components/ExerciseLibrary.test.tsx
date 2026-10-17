// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EXERCISES } from '../domain/exerciseLibrary';
import { ExerciseLibrary, filterExercises } from './ExerciseLibrary';

afterEach(cleanup);

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
    expect(screen.getByRole('button', { name: 'Chi tiết Plank' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Chi tiết Barbell Bench Press' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Tìm bài tập'), 'zzz');
    expect(screen.getByText(/Không có bài nào khớp/)).toBeTruthy();
  });
  it('opens an exercise for its detail and goes back to the list', async () => {
    render(<ExerciseLibrary onClose={() => {}}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Plank' }));
    expect(screen.getByRole('dialog', { name: 'Plank' })).toBeTruthy();
    expect(screen.getByText('Nhóm cơ chính')).toBeTruthy(); expect(screen.getByText(/Khuỷu dưới vai/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.getByRole('dialog', { name: 'Thư viện bài tập' })).toBeTruthy();
  });
});
