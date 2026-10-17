import { describe, expect, it } from 'vitest';
import type { QuestDto } from '../api/types';
import { pendingFirst, pickMain } from './mainQuest';

const q = (habitId: string, status: QuestDto['status']) => ({ habitId, status }) as QuestDto;

describe('main quest', () => {
  const quests = [q('a', 'COMPLETED'), q('b', 'PENDING'), q('c', 'PENDING')];
  it('defaults to the first unfinished quest', () => { expect(pickMain(quests, null)?.habitId).toBe('b'); });
  it('uses the pinned quest while it is unfinished', () => { expect(pickMain(quests, 'c')?.habitId).toBe('c'); });
  it('falls back when the pin is finished, unknown, or nothing is left', () => {
    expect(pickMain(quests, 'a')?.habitId).toBe('b');
    expect(pickMain(quests, 'zzz')?.habitId).toBe('b');
    expect(pickMain([q('a', 'COMPLETED')], 'a')).toBeUndefined();
  });
  it('lists unfinished before finished and keeps the order inside each group', () => {
    expect(pendingFirst([q('a', 'COMPLETED'), q('b', 'PENDING'), q('c', 'COMPLETED'), q('d', 'PENDING')]).map(x => x.habitId)).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('pickMain prefers a gym session by default', () => {
  const line = (title: string, unit: string) => ({ id: 'o', title, target: 10, unit, step: 5, value: 0 });
  const mk = (id: string, objectives: ReturnType<typeof line>[], status: 'PENDING' | 'COMPLETED' = 'PENDING') => ({ habitId: id, status, objectives }) as unknown as QuestDto;
  it('picks the unfinished gym quest over an earlier ordinary one, but a pin still wins and a finished gym quest does not count', () => {
    const water = mk('w', []), gym = mk('g', [line('Leg Press', 'rep')]);
    expect(pickMain([water, gym], null)?.habitId).toBe('g');
    expect(pickMain([water, gym], 'w')?.habitId).toBe('w');
    expect(pickMain([water, mk('g', [line('Leg Press', 'rep')], 'COMPLETED')], null)?.habitId).toBe('w');
    expect(pickMain([water, mk('x', [line('Plank', 'phút')])], null)?.habitId).toBe('w'); // same name, different unit: not a library exercise
  });
});
