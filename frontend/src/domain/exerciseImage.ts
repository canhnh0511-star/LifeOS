/** Instruction pictures (start and end position, muscle highlighted) in `public/art/exercises/<id>.jpg`. Add the id here when a file is added. */
export const EXERCISE_IMAGES: readonly string[] = [
  'leg-press', 'machine-chest-press', 'lat-pulldown', 'db-shoulder-press', 'glute-bridge', 'plank',
  'goblet-squat', 'push-up', 'db-row', 'db-romanian-deadlift', 'db-lateral-raise', 'bird-dog',
];

export function exerciseImage(id: string): string | undefined {
  return EXERCISE_IMAGES.includes(id) ? `/art/exercises/${id}.jpg` : undefined;
}
