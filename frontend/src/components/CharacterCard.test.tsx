// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AreaStatDto } from '../api/types';
import { ALL_CATEGORIES } from '../domain/insights';
import { CharacterCard } from './CharacterCard';

afterEach(cleanup);

const areas: AreaStatDto[] = ALL_CATEGORIES.map((category, i) => ({ category, xp: 100 * (i + 1), level: i + 1, levelStartXp: 0, nextLevelXp: 400 }));

describe('CharacterCard gear preview (demo only)', () => {
  it('offers no preview control outside demo mode and shows gear for the real level', () => {
    render(<CharacterCard areas={areas} totalXp={1500}/>);
    expect(screen.queryByRole('group', { name: /Xem thử bậc trang bị/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Sự nghiệp, level 1' }).getAttribute('title')).toBe('Đệm vai');
  });
  it('starts at the maximum tier in demo mode, and lets the viewer switch back to real levels or another tier', async () => {
    render(<CharacterCard areas={areas} totalXp={1500} allowPreview/>);
    const chip = () => screen.getByRole('button', { name: 'Sự nghiệp, level 1' });
    expect(chip().getAttribute('title')).toBe('Giáp vai kèm gorget'); // preview defaults to tier 4
    await userEvent.click(screen.getByRole('button', { name: 'Thật' }));
    expect(chip().getAttribute('title')).toBe('Đệm vai');
    await userEvent.click(screen.getByRole('button', { name: 'Bậc 2' }));
    expect(chip().getAttribute('title')).toBe('Giáp vai');
    expect(screen.getByRole('button', { name: 'Bậc 2' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('does not change the real levels that the chips and list report', async () => {
    render(<CharacterCard areas={areas} totalXp={1500} allowPreview/>);
    expect(screen.getByRole('button', { name: 'Sự nghiệp, level 1' })).toBeTruthy();
    expect(screen.getAllByText(/Lv 1 ·/).length).toBeGreaterThan(0);
  });
});

describe('CharacterCard', () => {
  it('renders without a canvas context (jsdom) and hides the decorative canvas from assistive tech', () => {
    const { container } = render(<CharacterCard areas={areas} totalXp={1500}/>);
    expect(container.querySelector('canvas')!.getAttribute('aria-hidden')).toBe('true');
  });
  it('offers one named, focusable chip per area with its level', () => {
    render(<CharacterCard areas={areas} totalXp={1500}/>);
    const chips = screen.getAllByRole('button', { name: /level \d/ });
    expect(chips).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Sự nghiệp, level 1' })).toBeTruthy();
  });
  it('marks the hovered or focused area as active and clears it on leave/blur', async () => {
    render(<CharacterCard areas={areas} totalXp={1500}/>);
    const chip = screen.getByRole('button', { name: 'Kiến thức, level 4' });
    await userEvent.hover(chip); expect(chip.getAttribute('aria-pressed')).toBe('true');
    await userEvent.unhover(chip); expect(chip.getAttribute('aria-pressed')).toBe('false');
    await userEvent.tab(); // first chip
    const focused = document.activeElement as HTMLElement;
    expect(focused.getAttribute('aria-pressed')).toBe('true');
    await userEvent.tab(); expect(focused.getAttribute('aria-pressed')).toBe('false');
  });
  it('highlights an area when its row in the stat list is hovered', async () => {
    render(<CharacterCard areas={areas} totalXp={1500}/>);
    await userEvent.hover(screen.getByText('Sức khỏe', { selector: 'strong' }));
    expect(screen.getByRole('button', { name: 'Sức khỏe, level 3' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps the full stat list (XP and progress) for screen readers', () => {
    render(<CharacterCard areas={areas} totalXp={1500}/>);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(/Tổng 1\.500 XP/)).toBeTruthy();
  });
});
