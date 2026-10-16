// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { CampaignMap } from './CampaignMap';
import type { ChapterDto } from '../api/types';

afterEach(cleanup);

const chapter = (index: number, tier: 1 | 2 | 3 | 4 | 5, earned: boolean): ChapterDto => ({
  index, title: `Chặng ${index}`, startDate: '2026-10-01', endDate: '2026-10-07',
  boss: { id: `b${index}`, code: `c${index}`, name: `Boss ${index}`, category: 'HEALTH', targetMinutes: 30, xpReward: 30, tier, requiredLevel: 1, currentAreaLevel: 1, artKey: 'slime-of-inertia', bossDate: '2026-10-07', status: earned ? 'DEFEATED' : 'AVAILABLE', defeatedDate: earned ? '2026-10-07' : null, defeatedAt: null },
  badge: { code: `bd${index}`, name: `Huy hiệu ${index}`, earned }
});

describe('CampaignMap gates and sigils', () => {
  it('counts earned sigils from the real badge state and labels each one', () => {
    render(<CampaignMap chapters={[chapter(1, 1, true), chapter(2, 2, false), chapter(3, 3, false)]} busyBossId={null} onDefeat={() => {}} onUndo={() => {}}/>);
    const shelf = screen.getByLabelText('Bộ sưu tập ấn ký');
    expect(shelf.textContent).toContain('Ấn ký 1/3');
    expect(shelf.textContent).toContain('Huy hiệu 1: đã nhận');
    expect(shelf.textContent).toContain('Huy hiệu 2: chưa nhận, hạ boss ở Cửa ải 2');
  });
  it('shows each gate with a difficulty rank taken from its boss tier', () => {
    render(<CampaignMap chapters={[chapter(1, 1, false), chapter(2, 3, false), chapter(3, 5, false)]} busyBossId={null} onDefeat={() => {}} onUndo={() => {}}/>);
    const gates = within(screen.getByLabelText('Bản đồ cửa ải')).getAllByRole('img').map(i => i.getAttribute('aria-label')).filter(l => l?.startsWith('Hạng'));
    expect(gates).toEqual(['Hạng E', 'Hạng C', 'Hạng A']);
    expect(screen.getByText('Cửa ải 2')).toBeTruthy();
  });
});
