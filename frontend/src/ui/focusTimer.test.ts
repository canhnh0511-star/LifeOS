import { describe, expect, it } from 'vitest';
import { clock, elapsedMs, idleTimer, isRunning, pauseTimer, startTimer } from './focusTimer';

describe('focus timer', () => {
  it('counts from timestamps, pauses, resumes and survives a reload', () => {
    let t = startTimer(idleTimer, 1000);
    expect(isRunning(t)).toBe(true); expect(elapsedMs(t, 4000)).toBe(3000);
    t = pauseTimer(t, 4000);
    expect(isRunning(t)).toBe(false); expect(elapsedMs(t, 99999)).toBe(3000);
    t = startTimer(t, 10000);
    expect(elapsedMs(t, 12000)).toBe(5000);
    const reloaded = JSON.parse(JSON.stringify(t)); // what localStorage keeps
    expect(elapsedMs(reloaded, 15000)).toBe(8000);
  });
  it('ignores a second start and a pause while idle, and never goes negative', () => {
    const t = startTimer(idleTimer, 1000);
    expect(startTimer(t, 5000)).toBe(t);
    expect(pauseTimer(idleTimer, 5000)).toBe(idleTimer);
    expect(elapsedMs(t, 500)).toBe(0);
  });
  it('formats minutes and hours', () => {
    expect(clock(83)).toBe('01:23'); expect(clock(3683)).toBe('1:01:23'); expect(clock(-5)).toBe('00:00');
  });
});
