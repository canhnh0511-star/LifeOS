import { describe, expect, it } from 'vitest';
import { weekDates, weekStart } from './week';

describe('week helpers', () => {
  it('runs Monday to Sunday around any day, including month ends', () => {
    expect(weekStart('2026-10-17')).toBe('2026-10-12'); // a Saturday
    expect(weekStart('2026-10-19')).toBe('2026-10-19'); // a Monday
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // a Sunday belongs to the week before
    expect(weekDates('2026-10-29')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  });
});
