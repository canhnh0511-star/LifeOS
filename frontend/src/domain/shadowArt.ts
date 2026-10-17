import { exerciseByName, type MuscleGroup } from './exerciseLibrary';

/** The three shadow figures, picked by the muscle group of the record: legs → knight, core → assassin, everything else → brute. */
export type ShadowKind = 'knight' | 'brute' | 'assassin';
export const SHADOW_LOOK: Record<ShadowKind, string> = {
  knight: 'Bóng hiệp sĩ có sừng, mắt tím phát sáng', brute: 'Bóng khổng lồ vai rộng, mắt tím phát sáng', assassin: 'Bóng sát thủ trùm mũ, mắt tím phát sáng'
};
const BY_GROUP: Partial<Record<MuscleGroup, ShadowKind>> = { LEGS: 'knight', CORE: 'assassin' };
export const shadowKind = (exercise: string): ShadowKind => BY_GROUP[exerciseByName(exercise)?.group ?? 'CHEST'] ?? 'brute';
export const shadowArt = (exercise: string) => `/art/shadows/${shadowKind(exercise)}.jpg`;
