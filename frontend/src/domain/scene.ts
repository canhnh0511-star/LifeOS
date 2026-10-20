import type { GoalCategory, QuestDto } from '../api/types';
import { exerciseByName, isLibraryLine, type MuscleGroup } from './exerciseLibrary';

/** The anime backdrop behind a Today card: one per muscle group of the gym library, one per quest category. */
export type SceneKey = MuscleGroup | GoalCategory;

export const SCENE_KEYS: readonly SceneKey[] = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'CAREER', 'CREATIVITY', 'HEALTH', 'KNOWLEDGE', 'MINDFULNESS'];

/** Short description for each scene; the picture is decorative, this documents what it shows. */
export const sceneDescription: Record<SceneKey, string> = {
  CHEST: 'Chống đẩy trên mái nhà lúc hoàng hôn', BACK: 'Hít xà dưới thành phố ban đêm', LEGS: 'Squat với tạ đòn lúc bình minh',
  SHOULDERS: 'Đẩy tạ đơn qua đầu dưới trời tím', ARMS: 'Cuốn tạ tay trong phòng tập', CORE: 'Plank dưới trăng',
  CAREER: 'Làm việc bên laptop trong đêm', CREATIVITY: 'Chơi guitar giữa hoàng hôn', HEALTH: 'Chạy bộ lúc mặt trời mọc',
  KNOWLEDGE: 'Đọc sách dưới ánh đèn', MINDFULNESS: 'Thiền dưới trăng'
};

/** The scene of a quest: its first gym exercise's muscle group when it has one, otherwise its category. */
export function sceneForQuest(q: Pick<QuestDto, 'category' | 'objectives'>): SceneKey {
  for (const o of q.objectives) {
    if (!isLibraryLine(o)) continue;
    const e = exerciseByName(o.title);
    if (e) return e.group;
  }
  return q.category;
}
