// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RankBadge } from './RankBadge';
import { Celebration } from './Celebration';

afterEach(cleanup);

describe('RankBadge', () => {
  it('has an accessible rank name and the rank class', () => {
    render(<RankBadge level={12}/>);
    const badge = screen.getByRole('img', { name: 'Hạng C' });
    expect(badge.getAttribute('class')).toContain('rank-c');
  });
  it('celebrates a rank-up with the new rank', () => {
    render(<Celebration data={{ level: 5, areas: [], rank: 'D' }} onClose={() => {}}/>);
    expect(screen.getByRole('dialog', { name: /LÊN HẠNG/ })).toBeTruthy();
    expect(screen.getByText('Bạn đạt Hạng D')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Hạng D' })).toBeTruthy();
  });
});
