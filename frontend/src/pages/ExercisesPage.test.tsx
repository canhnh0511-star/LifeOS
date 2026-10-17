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
  it('expands an exercise in place (no popup), keeps the search, and opens only one at a time', async () => {
    render(<ExercisesPage/>);
    await userEvent.type(screen.getByLabelText('Tìm bài tập'), 'plank');
    const row = screen.getByRole('button', { name: /Chi tiết Plank/ });
    expect(row.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('region', { name: /Chi tiết Plank/ })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((screen.getByLabelText('Tìm bài tập') as HTMLInputElement).value).toBe('plank');
    await userEvent.click(row);
    expect(screen.queryByRole('region', { name: /Chi tiết Plank/ })).toBeNull();
  });
  it('opening a second exercise closes the first', async () => {
    render(<ExercisesPage/>);
    await userEvent.click(screen.getByRole('button', { name: /Chi tiết Hít đất/ }));
    await userEvent.click(screen.getByRole('button', { name: /Chi tiết Ép ngực với máy cáp/ }));
    expect(screen.getAllByRole('region', { name: /^Chi tiết/ })).toHaveLength(1);
  });
});
