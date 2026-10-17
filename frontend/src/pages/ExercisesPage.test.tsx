// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisesPage } from './ExercisesPage';

afterEach(cleanup);

describe('Bài tập tab', () => {
  it('shows the library as a page (not a dialog), searchable by Vietnamese without accents', async () => {
    render(<ExercisesPage/>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Bài tập' })).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Tìm bài tập'), 'hit dat');
    expect(screen.getByRole('button', { name: /Chi tiết Hít đất/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Chi tiết Kéo xà đơn/ })).toBeNull();
  });
  it('opens an exercise in detail and returns to the same search when closed', async () => {
    render(<ExercisesPage/>);
    await userEvent.type(screen.getByLabelText('Tìm bài tập'), 'plank');
    await userEvent.click(screen.getByRole('button', { name: /Chi tiết Plank/ }));
    expect(screen.getByRole('dialog', { name: /Plank/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((screen.getByLabelText('Tìm bài tập') as HTMLInputElement).value).toBe('plank');
  });
});
