// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { moreNav, primaryNav, tabFromHash } from './nav';

afterEach(() => { window.location.hash = ''; });

describe('navigation (gym v1)', () => {
  it('has exactly four primary destinations, in this order', () => {
    expect(primaryNav.map(n => n.title)).toEqual(['Hôm nay', 'Bài tập', 'Tiến độ', 'Nhân vật']);
    expect(primaryNav.map(n => n.id)).toEqual(['today', 'exercises', 'insights', 'character']);
  });
  it('keeps Hành trình and Số đo reachable from the side menu only, so no data or feature is lost', () => {
    expect(moreNav.map(n => n.id)).toEqual(['journey', 'body']);
    for (const n of moreNav) expect(primaryNav.some(p => p.id === n.id)).toBe(false);
  });
  it('reads every tab from the hash (old links still work) and falls back to Hôm nay', () => {
    for (const id of ['today', 'exercises', 'insights', 'character', 'journey', 'body']) { window.location.hash = id; expect(tabFromHash()).toBe(id); }
    window.location.hash = 'nonsense'; expect(tabFromHash()).toBe('today');
  });
});
