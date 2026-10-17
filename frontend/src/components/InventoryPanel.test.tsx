// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryPanel } from './InventoryPanel';
import { ChestOpening } from './ChestOpening';
import { ITEM_CATALOG } from '../domain/items';
import type { ItemDto } from '../api/types';

afterEach(cleanup);

const views = (owned: string[], worn: string[] = []): ItemDto[] => ITEM_CATALOG.map(c => ({ ...c, owned: owned.includes(c.code), equipped: worn.includes(c.code), acquiredDate: owned.includes(c.code) ? '2026-10-16' : null }));

describe('InventoryPanel', () => {
  it('shows what is worn per slot and keeps unowned items locked', () => {
    render(<InventoryPanel items={views(['WOLF_FANG_SWORD', 'LATE_WIND_TREADS'], ['WOLF_FANG_SWORD'])} busyCode={null} onEquip={() => {}} onUnequip={() => {}}/>);
    expect(screen.getByLabelText('Vũ khí: đang đeo Kiếm Nanh Sói')).toBeTruthy();
    expect(screen.getByLabelText('Đầu: trống')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chưa sở hữu: Gương Vua Vô Danh' })).toBeTruthy();
    expect(screen.getByText(/Sưu tập 2\/6/)).toBeTruthy();
  });
  it('offers "Đeo vào" for an owned item, "Tháo ra" for a worn one, and nothing to wear for a locked one', async () => {
    const onEquip = vi.fn(); const onUnequip = vi.fn();
    render(<InventoryPanel items={views(['WOLF_FANG_SWORD', 'LATE_WIND_TREADS'], ['WOLF_FANG_SWORD'])} busyCode={null} onEquip={onEquip} onUnequip={onUnequip}/>);
    await userEvent.click(screen.getByRole('button', { name: /^Late|Giày Bước Gió Muộn, Khá/ }));
    const detail = screen.getByLabelText('Chi tiết Giày Bước Gió Muộn');
    await userEvent.click(within(detail).getByRole('button', { name: 'Đeo vào' }));
    expect(onEquip).toHaveBeenCalledWith(expect.objectContaining({ code: 'LATE_WIND_TREADS' }));
    await userEvent.click(screen.getByRole('button', { name: /Kiếm Nanh Sói, Hiếm, đang đeo/ }));
    await userEvent.click(within(screen.getByLabelText('Chi tiết Kiếm Nanh Sói')).getByRole('button', { name: 'Tháo ra' }));
    expect(onUnequip).toHaveBeenCalledWith(expect.objectContaining({ code: 'WOLF_FANG_SWORD' }));
    await userEvent.click(screen.getByRole('button', { name: 'Chưa sở hữu: Gương Vua Vô Danh' }));
    const locked = screen.getByLabelText('Chi tiết Gương Vua Vô Danh');
    expect(within(locked).queryByRole('button')).toBeNull();
    expect(locked.textContent).toContain('Chưa sở hữu');
  });
});

describe('ChestOpening with an item', () => {
  it('reveals the item the chest dropped', async () => {
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia; // reduced motion: reveal at once
    render(<ChestOpening reward={{ tier: 'GOLD', threshold: 1, xp: 40, state: 'EARNED', itemCode: 'NAMELESS_KING_MIRROR' }} onRevealed={() => {}} onClose={() => {}}/>);
    expect(screen.getByLabelText('Vật phẩm mới: Gương Vua Vô Danh')).toBeTruthy();
  });
  it('shows no item block when the chest dropped nothing', () => {
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    render(<ChestOpening reward={{ tier: 'WOOD', threshold: 1, xp: 10, state: 'EARNED', itemCode: null }} onRevealed={() => {}} onClose={() => {}}/>);
    expect(screen.queryByLabelText(/Vật phẩm mới/)).toBeNull();
  });
});

describe('InventoryPanel filters and unlock hints (B-29/B-40)', () => {
  it('filters owned, worn and locked items with counts, and tells how a locked item can be found', async () => {
    render(<InventoryPanel items={views(['WOLF_FANG_SWORD', 'LATE_WIND_TREADS'], ['WOLF_FANG_SWORD'])} busyCode={null} onEquip={() => {}} onUnequip={() => {}}/>);
    expect(screen.getByRole('button', { name: /^Đã có/ }).textContent).toContain('2');
    await userEvent.click(screen.getByRole('button', { name: /^Đang đeo/ }));
    expect(screen.getAllByRole('button', { name: /Kiếm Nanh Sói/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Giày Bước Gió Muộn/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Chưa có/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Chưa sở hữu: Gương Vua Vô Danh' }));
    expect(screen.getByText(/Có thể rơi từ rương Vàng\./)).toBeTruthy();
  });
});
