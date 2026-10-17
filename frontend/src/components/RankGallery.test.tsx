// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { RankGallery } from './RankGallery';
import { RankPortrait } from './RankPortrait';

afterEach(cleanup);

describe('RankPortrait', () => {
  it('shows the portrait of the rank for that level, with a description in the alt text', () => {
    render(<RankPortrait level={7}/>);
    const img = screen.getByRole('img', { name: /Hạng D.*áo khoác đen/ }) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/art/ranks/rank-d.jpg');
  });
  it('can be dimmed for a rank not reached yet', () => {
    render(<RankPortrait level={30} locked/>);
    expect(screen.getByRole('img').closest('.rank-portrait')?.classList.contains('is-locked')).toBe(true);
  });
});

describe('RankGallery', () => {
  it('lists all six ranks in order, each with its name', () => {
    render(<RankGallery level={4}/>);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    ['Tân binh', 'Thức tỉnh', 'Chiến binh', 'Tinh nhuệ', 'Bậc thầy', 'Huyền thoại'].forEach((name, i) => expect(within(items[i]).getByText(name)).toBeTruthy());
  });
  it('marks the current rank, and says at which level each later rank opens', () => {
    render(<RankGallery level={4}/>);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('BẠN Ở ĐÂY')).toBeTruthy();
    expect(within(items[1]).getByText('MỞ Ở CẤP 5')).toBeTruthy();
    expect(within(items[5]).getByText('MỞ Ở CẤP 30')).toBeTruthy();
    expect(screen.getAllByText('BẠN Ở ĐÂY')).toHaveLength(1);
  });
  it('shows reached ranks as unlocked and later ranks as locked', () => {
    render(<RankGallery level={12}/>);
    const items = screen.getAllByRole('listitem');
    expect(items.map(i => i.classList.contains('is-locked'))).toEqual([false, false, false, true, true, true]);
    expect(within(items[0]).getByText('ĐÃ MỞ')).toBeTruthy();
    expect(within(items[2]).getByText('BẠN Ở ĐÂY')).toBeTruthy();
  });
  it('has an accessible name', () => {
    render(<RankGallery level={1}/>);
    expect(screen.getByRole('list', { name: 'Diện mạo theo hạng' })).toBeTruthy();
  });
});
