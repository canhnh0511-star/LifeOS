import { describe, expect, it } from 'vitest';
import { SCENE_KEYS, sceneDescription, sceneForQuest } from './scene';

const pictures = Object.keys(import.meta.glob('../../public/art/scenes/*.jpg'));
const obj = (title: string, unit = 'rep') => ({ id: title, title, unit, target: 10, current: 0, unitLabel: unit }) as never;

describe('scenes', () => {
  it('has a picture and a description for every scene', () => {
    for (const k of SCENE_KEYS) {
      expect(pictures.some(f => f.endsWith(`/${k.toLowerCase()}.jpg`)), k).toBe(true);
      expect(sceneDescription[k]).toBeTruthy();
    }
  });
  it('uses the muscle group of the first gym exercise of a quest', () => {
    expect(sceneForQuest({ category: 'HEALTH', objectives: [obj('Push-up')] })).toBe('CHEST');
  });
  it('falls back to the quest category when there is no gym exercise', () => {
    expect(sceneForQuest({ category: 'KNOWLEDGE', objectives: [obj('Read 20 pages', 'trang')] })).toBe('KNOWLEDGE');
    expect(sceneForQuest({ category: 'MINDFULNESS', objectives: [] })).toBe('MINDFULNESS');
  });
});
