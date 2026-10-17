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
