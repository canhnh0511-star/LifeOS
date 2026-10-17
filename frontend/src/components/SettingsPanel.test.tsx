// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import { demoToday, todayInTimezone } from '../domain/rules';
import { prefersReducedMotion, setReduceMotionPref } from '../ui/motion';

const noop = () => {};
afterEach(() => { cleanup(); setReduceMotionPref(false); localStorage.removeItem('lifeos.demo.today'); });

describe('reduced-motion setting (RPG-01)', () => {
  it('starts off, turns on and off from the settings switch, and remembers it', async () => {
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    render(<SettingsPanel isDemo onExport={noop} onReset={noop} onLogout={noop}/>);
    const box = screen.getByRole("checkbox", { name: /giảm chuyển động/i }) as HTMLInputElement;
    expect(box.checked).toBe(false); expect(prefersReducedMotion()).toBe(false);
    await userEvent.click(box);
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduce');
    expect(prefersReducedMotion()).toBe(true);
    await userEvent.click(box);
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
    expect(prefersReducedMotion()).toBe(false);
  });
  it('the system setting wins even when the switch is off', () => {
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('demo date for trying future days', () => {
  it('sets the date, reloads, and can go back to the real date; hidden for the real API', async () => {
    const onReload = vi.fn();
    render(<SettingsPanel isDemo onExport={() => {}} onReset={() => {}} onLogout={() => {}} onReload={onReload}/>);
    fireEvent.change(screen.getByLabelText(/Ngày hôm nay/), { target: { value: '2026-10-19' } });
    await userEvent.click(screen.getByRole('button', { name: /Áp dụng/ }));
    expect(localStorage.getItem('lifeos.demo.today')).toBe('2026-10-19'); expect(onReload).toHaveBeenCalledTimes(1);
    expect(todayInTimezone()).toBe('2026-10-19');
    cleanup();
    render(<SettingsPanel isDemo onExport={() => {}} onReset={() => {}} onLogout={() => {}} onReload={onReload}/>);
    expect(screen.getByText(/Đang giả lập 2026-10-19/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Dùng ngày thật' }));
    expect(localStorage.getItem('lifeos.demo.today')).toBeNull(); expect(onReload).toHaveBeenCalledTimes(2);
    cleanup();
    render(<SettingsPanel isDemo={false} onExport={() => {}} onReset={() => {}} onLogout={() => {}}/>);
    expect(screen.queryByLabelText(/Ngày hôm nay/)).toBeNull();
  });
  it('ignores a garbage value in storage', () => {
    localStorage.setItem('lifeos.demo.today', 'not-a-date');
    expect(todayInTimezone()).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(demoToday()).toBeNull();
  });
});
