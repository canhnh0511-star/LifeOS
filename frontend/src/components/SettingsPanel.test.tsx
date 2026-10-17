// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import { prefersReducedMotion, setReduceMotionPref } from '../ui/motion';

const noop = () => {};
afterEach(() => { cleanup(); setReduceMotionPref(false); });

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
