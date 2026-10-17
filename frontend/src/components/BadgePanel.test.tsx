// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { BadgeDto } from '../api/types';
import { BadgePanel } from './BadgePanel';

afterEach(cleanup);
const badges: BadgeDto[] = [
  { code: 'BADGE_FIRST_WORKOUT', name: 'Buổi tập đầu tiên', description: 'Hoàn thành một buổi tập.', earned: true, progress: 1, target: 1 },
  { code: 'BADGE_10_SESSIONS', name: 'Mười buổi tập', description: 'Hoàn thành 10 buổi tập.', earned: false, progress: 4, target: 10 }
];
describe('BadgePanel (B-29)', () => {
  it('shows earned badges as reached and the others with their condition and progress', async () => {
    render(<BadgePanel loadBadges={async () => badges}/>);
    expect(await screen.findByText('Buổi tập đầu tiên')).toBeTruthy();
    expect(screen.getByText('Đã đạt')).toBeTruthy();
    expect(screen.getByText('4/10')).toBeTruthy(); expect(screen.getByText('Hoàn thành 10 buổi tập.')).toBeTruthy();
    expect(screen.getByText(/1\/2/)).toBeTruthy();
  });
  it('reports a failure to load', async () => {
    render(<BadgePanel loadBadges={vi.fn(async () => { throw new Error('x'); })}/>);
    expect((await screen.findByRole('alert')).textContent).toContain('Không tải được');
  });
});
