import { describe, expect, it } from 'vitest';
import { exerciseByName } from './exerciseLibrary';
import { STANDARD_DAYS, STANDARD_PLAN_DESCRIPTION, STANDARD_PLAN_TITLE, standardPlanTemplate } from './standardPlan';

// The backend's definition, read as text so the two copies cannot drift apart unnoticed.
// @ts-ignore node types are not part of the app's tsconfig; this test runs in node
const { readFileSync } = await import('node:fs');
const java: string = readFileSync(new URL('../../../backend/src/main/java/app/lifeos/plan/StandardPlan.java', import.meta.url), 'utf8');

describe('standard plan', () => {
  it('uses only library exercises, with the unit the library gives them', () => {
    for (const d of STANDARD_DAYS) for (const l of d.lines) { const e = exerciseByName(l.title); expect(e, l.title).toBeTruthy(); expect(l.unit).toBe(e!.unit); expect(l.target % l.step).toBe(0); }
  });
  it('is three sessions of six exercises on Monday, Wednesday and Friday, none started', () => {
    const t = standardPlanTemplate();
    expect(t.started).toBe(false); expect(t.goalId).toBeNull();
    expect(t.sessions.map(s => s.weekdays[0])).toEqual([1, 3, 5]);
    expect(t.sessions.every(s => s.habitId === null && s.objectives.length === 6)).toBe(true);
  });
  it('agrees with the backend definition: title, description, sessions and every exercise with its sets and size', () => {
    expect(java).toContain(`"${STANDARD_PLAN_TITLE}"`);
    for (const part of STANDARD_PLAN_DESCRIPTION.split(/(?<=\. )/)) expect(java).toContain(part.trim().replace(/\.$/, ''));
    for (const d of STANDARD_DAYS) {
      expect(java).toContain(`"${d.title}"`);
      for (const l of d.lines) {
        const call = l.unit === 'giây' ? 'hold' : 'reps';
        expect(java, `${l.title} ${l.target}/${l.step}`).toContain(`${call}("${l.title}", ${l.target / l.step}, ${l.step})`);
      }
    }
  });
});
