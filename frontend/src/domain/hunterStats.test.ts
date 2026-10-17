import { describe, expect, it } from 'vitest';
import { bossProgress, hunterStats, shadows } from './hunterStats';

const s = (exercise: string, setNo: number, reps: number, weightKg: number | null) => ({ exercise, setNo, reps, weightKg });
const day = (date: string, ...sets: ReturnType<typeof s>[]) => ({ date, sets });

describe('shadows: one per new personal record', () => {
  it('summons a shadow when an exercise beats its earlier heaviest weight, not for the first log or a tie', () => {
    const r = shadows([
      day('2026-10-05', s('Leg Press', 1, 10, 80)),
      day('2026-10-07', s('Leg Press', 1, 10, 80), s('Machine Chest Press', 1, 10, 30)),
      day('2026-10-12', s('Leg Press', 1, 8, 90), s('Leg Press', 2, 8, 100), s('Plank', 1, 40, null)),
    ]);
    expect(r).toEqual([{ exercise: 'Leg Press', date: '2026-10-12', weightKg: 100 }]);
  });
  it('is empty with no history', () => { expect(shadows([])).toEqual([]); });
});

describe('bossProgress: sessions done against the week plan', () => {
  const days = [day('2026-10-12', s('Leg Press', 1, 10, 80)), day('2026-10-14'), day('2026-10-15', s('Plank', 1, 30, null)), day('2026-10-21', s('Leg Press', 1, 10, 80))];
  it('counts only days with sets inside the week and defeats the boss at the plan', () => {
    expect(bossProgress(days, '2026-10-12', 3)).toEqual({ done: 2, planned: 3, defeated: false });
    expect(bossProgress(days, '2026-10-12', 2)).toEqual({ done: 2, planned: 2, defeated: true });
  });
  it('never defeats a boss when nothing is planned', () => { expect(bossProgress([], '2026-10-12', 0).defeated).toBe(false); });
});

describe('hunterStats: five stats against your own last 4 weeks', () => {
  const base = (date: string, w: number, reps = 10) => day(date, s('Leg Press', 1, reps, w), s('Leg Press', 2, reps, w), s('Machine Chest Press', 1, reps, 30));
  const history = [base('2026-09-21', 80), base('2026-09-28', 80), base('2026-10-05', 80), base('2026-10-12', 80)];
  it('has no scores without a 4-week baseline', () => {
    const r = hunterStats([base('2026-10-19', 80)], '2026-10-19', 3);
    expect(r.strength).toBeNull(); expect(r.volume).toBeNull();
  });
  it('rates matching your baseline at 70 and a heavier week higher', () => {
    const same = hunterStats([...history, base('2026-10-19', 80)], '2026-10-19', 3);
    expect(same.strength).toBe(70); expect(same.volume).toBe(70); expect(same.endurance).toBe(70);
    const heavy = hunterStats([...history, base('2026-10-19', 88)], '2026-10-19', 3);
    expect(heavy.strength).toBe(74); // Leg Press +10%, chest press unchanged: mean ratio 1.05
  });
  it('caps at 100, and will = sessions done over planned', () => {
    const r = hunterStats([...history, base('2026-10-19', 200), base('2026-10-20', 200)], '2026-10-19', 3);
    expect(r.strength).toBe(100); expect(r.will).toBe(67);
  });
  it('balance is low when one muscle group takes everything', () => {
    const onlyLegs = [1, 2, 3, 4].map(i => day(`2026-10-0${i}`, s('Leg Press', 1, 10, 80)));
    const r = hunterStats(onlyLegs, '2026-10-05', 3);
    expect(r.balance).toBe(0);
  });
});
