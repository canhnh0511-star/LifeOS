// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { BossDto } from '../api/types';
import { Celebration, hasCelebration, type CelebrationData } from './Celebration';

afterEach(cleanup);

const boss: BossDto = { id: 'b', code: 'SLIME_OF_INERTIA', name: 'Slime of Inertia', category: 'MINDFULNESS', targetMinutes: 60, xpReward: 40, tier: 1, requiredLevel: 1, currentAreaLevel: 1, artKey: 'slime-of-inertia', bossDate: '2026-10-01', status: 'DEFEATED', defeatedDate: '2026-10-14', defeatedAt: null };

function Harness({ data }: { data: CelebrationData }) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>trigger</button>{open && <Celebration data={data} onClose={() => setOpen(false)}/>}</>;
}

function ReplacedOpener() {
  const [open, setOpen] = useState(false);
  return <main data-dialog-fallback tabIndex={-1}>
    {!open && <button onClick={() => setOpen(true)}>trigger</button>}
    {open && <Celebration data={{ level: 5, areas: [] }} onClose={() => setOpen(false)}/>}
  </main>;
}

function BodyOpener() {
  const [open, setOpen] = useState(false);
  return <main data-dialog-fallback tabIndex={-1}>
    <button onClick={() => { (document.activeElement as HTMLElement).blur(); setOpen(true); }}>trigger</button>
    {open && <Celebration data={{ level: 5, areas: [] }} onClose={() => setOpen(false)}/>}
  </main>;
}

describe('hasCelebration', () => {
  it('is true for a boss, an overall level or any area level, false otherwise', () => {
    expect(hasCelebration({ level: null, areas: [] })).toBe(false);
    expect(hasCelebration({ level: 5, areas: [] })).toBe(true);
    expect(hasCelebration({ level: null, areas: [{ category: 'HEALTH', level: 2 }] })).toBe(true);
    expect(hasCelebration({ level: null, areas: [], boss: { boss, xp: 40, badgeName: null } })).toBe(true);
  });
});

describe('Celebration: rank-up shows the change', () => {
  it('puts the portrait of the old rank next to the new one, names the new rank and lists what it unlocks', () => {
    render(<Celebration data={{ level: 5, areas: [], rank: 'D' }} onClose={() => {}}/>);
    expect(screen.getByRole('img', { name: /^Hạng E:/ }).getAttribute('src')).toBe('/art/ranks/rank-e.jpg');
    expect(screen.getByRole('img', { name: /^Hạng D:/ }).getAttribute('src')).toBe('/art/ranks/rank-d.jpg');
    expect(screen.getByText('Hạng D · Thức tỉnh')).toBeTruthy();
    const unlocks = screen.getByRole('list', { name: 'Mở khoá' });
    expect(unlocks.textContent).toContain('Diện mạo nhân vật hạng D'); expect(unlocks.textContent).toContain('Danh hiệu "Thức tỉnh"');
  });
  it('shows no portraits for a plain level-up or a boss win', () => {
    render(<Celebration data={{ level: 6, areas: [] }} onClose={() => {}}/>);
    expect(screen.queryByRole('img', { name: /^Hạng/ })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Mở khoá' })).toBeNull();
  });
});

describe('Celebration', () => {
  it('is a labelled modal dialog that takes focus and gives it back on Escape', async () => {
    render(<Harness data={{ level: 5, areas: [] }}/>); const trigger = screen.getByText('trigger');
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'LÊN CẤP!' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('falls back to the page landmark when the opener was replaced while the dialog was open', async () => {
    const { container } = render(<ReplacedOpener/>);
    await userEvent.click(screen.getByText('trigger'));
    expect(screen.queryByText('trigger')).toBeNull(); // the opener is gone
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(container.querySelector('main'));
  });
  it('does not "restore" focus to body when nothing had focus at open time', async () => {
    const { container } = render(<BodyOpener/>);
    await userEvent.click(screen.getByText('trigger'));
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(container.querySelector('main'));
  });
  it('keeps Tab inside the dialog and closes from its button', async () => {
    render(<Harness data={{ level: 5, areas: [] }}/>); await userEvent.click(screen.getByText('trigger'));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 4; i++) { await userEvent.tab(); expect(dialog.contains(document.activeElement)).toBe(true); }
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('announces the badge, the level and each area that levelled up', async () => {
    const data: CelebrationData = { level: 5, areas: [{ category: 'CAREER', level: 3 }, { category: 'HEALTH', level: 2 }], boss: { boss, xp: 40, badgeName: 'Huy hiệu Người khởi hành' } };
    render(<Harness data={data}/>); await userEvent.click(screen.getByText('trigger'));
    expect(screen.getByRole('dialog', { name: /Slime of Inertia bị hạ!/ })).toBeTruthy();
    for (const text of ['+40 XP', 'Nhận Huy hiệu Người khởi hành', 'Sự nghiệp lên Lv 3', 'Sức khỏe lên Lv 2']) expect(screen.getByText(text, { exact: false })).toBeTruthy();
    expect(screen.getByText(/Level 5/)).toBeTruthy();
  });
  it('closes by itself after the dismiss delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<Harness data={{ level: 5, areas: [] }}/>); await userEvent.click(screen.getByText('trigger'));
      expect(screen.getByRole('dialog')).toBeTruthy();
      await act(async () => { await vi.advanceTimersByTimeAsync(8100); });
      expect(screen.queryByRole('dialog')).toBeNull();
    } finally { vi.useRealTimers(); }
  });
});
