import { describe, expect, it } from 'vitest';
import type { PlanVariant } from '../api/types';
import { exerciseByName } from './exerciseLibrary';
import { STANDARD_DAYS_BY_VARIANT, STANDARD_DESCRIPTION, STANDARD_PLAN_TITLE, VARIANTS, standardPlanTemplate, variantFor, variantOfDescription } from './standardPlan';

// The backend's definition, read as text so the two copies cannot drift apart unnoticed.
// @ts-ignore node types are not part of the app's tsconfig; this test runs in node
const { readFileSync } = await import('node:fs');
const java: string = readFileSync(new URL('../../../backend/src/main/java/app/lifeos/plan/StandardPlan.java', import.meta.url), 'utf8');
/** The part of the Java file that defines one version's days. */
const javaDays = (v: PlanVariant) => { const at = java.indexOf(`DAYS_${v} = `); return java.slice(at, java.indexOf('));', at)); };
const namesOf = (v: PlanVariant) => STANDARD_DAYS_BY_VARIANT[v].flatMap(d => d.lines.map(l => l.title));
const count = (v: PlanVariant, name: string) => namesOf(v).filter(n => n === name).length;

describe('standard plan versions', () => {
  it('every version uses only library exercises, with the unit the library gives them, in three sessions of six on Monday, Wednesday and Friday', () => {
    for (const v of VARIANTS) {
      const t = standardPlanTemplate(v);
      expect(t.sessions.map(s => s.weekdays[0]), v).toEqual([1, 3, 5]);
      expect(t.started).toBe(false); expect(t.goalId).toBeNull(); expect([t.variant, t.suggestedVariant]).toEqual([v, v]);
      for (const d of STANDARD_DAYS_BY_VARIANT[v]) {
        expect(d.lines, v).toHaveLength(6);
        for (const l of d.lines) { const e = exerciseByName(l.title); expect(e, l.title).toBeTruthy(); expect(l.unit).toBe(e!.unit); expect(l.target % l.step).toBe(0); }
      }
    }
  });
  it('picks the version from the body goal: gaining is BUILD, losing is GENTLE from a BMI of 30, STANDARD below, no goal is GENTLE', () => {
    expect(variantFor(null)).toBe('GENTLE'); expect(variantFor(undefined)).toBe('GENTLE');
    expect(variantFor({ heightCm: 166, startWeightKg: 86, targetWeightKg: 78.5 })).toBe('GENTLE');   // BMI 31.2
    expect(variantFor({ heightCm: 175, startWeightKg: 85, targetWeightKg: 78 })).toBe('STANDARD');   // BMI 27.8
    expect(variantFor({ heightCm: 175, startWeightKg: 91.9, targetWeightKg: 80 })).toBe('GENTLE');   // BMI 30.0
    expect(variantFor({ heightCm: 175, startWeightKg: 60, targetWeightKg: 66 })).toBe('BUILD');
  });
  it('the gentle version has no floor push-ups or impact and a 30 s plank; standard has push-ups; build has four-set main lifts', () => {
    for (const impact of ['Push-up', 'Mountain Climber', 'Walking Lunge', 'Pull-up', 'Back Squat', 'Deadlift']) expect(namesOf('GENTLE')).not.toContain(impact);
    expect(namesOf('STANDARD')).toContain('Push-up');
    expect(STANDARD_DAYS_BY_VARIANT.GENTLE[0]!.lines.at(-1)).toMatchObject({ title: 'Plank', step: 30 });
    expect(STANDARD_DAYS_BY_VARIANT.BUILD[0]!.lines[0]).toMatchObject({ title: 'Leg Press', target: 40, step: 10 });
  });
  it('trains the big movements twice a week in every version', () => {
    for (const v of VARIANTS) {
      expect(count(v, 'Leg Press') + count(v, 'Goblet Squat'), v).toBeGreaterThanOrEqual(3);
      expect(count(v, 'Lat Pulldown') + count(v, 'One-arm Dumbbell Row'), v).toBeGreaterThanOrEqual(3);
      expect(count(v, 'Dumbbell Romanian Deadlift'), v).toBeGreaterThanOrEqual(2);
    }
  });
  it('has a different description for each version, each within the goal limit, and tells a stored plan which version it is', () => {
    expect(new Set(VARIANTS.map(v => STANDARD_DESCRIPTION[v])).size).toBe(3);
    for (const v of VARIANTS) { expect(STANDARD_DESCRIPTION[v].length, v).toBeLessThanOrEqual(600); expect(variantOfDescription(STANDARD_DESCRIPTION[v])).toBe(v); }
    expect(variantOfDescription('đã sửa')).toBeNull();
  });
  it('agrees with the backend definition: title, every description, every session and every exercise with its sets and size', () => {
    expect(java).toContain(`"${STANDARD_PLAN_TITLE}"`);
    for (const v of VARIANTS) {
      for (const part of STANDARD_DESCRIPTION[v].split(/(?<=\. )/)) expect(java, `${v}: ${part}`).toContain(part.trim().replace(/\.$/, ''));
      const block = javaDays(v);
      for (const d of STANDARD_DAYS_BY_VARIANT[v]) {
        expect(block, `${v}: ${d.title}`).toContain(`"${d.title}"`);
        for (const l of d.lines) {
          const call = l.unit === 'giây' ? 'hold' : 'reps';
          expect(block, `${v}: ${l.title} ${l.target}/${l.step}`).toContain(`${call}("${l.title}", ${l.target / l.step}, ${l.step})`);
        }
      }
    }
  });
});
