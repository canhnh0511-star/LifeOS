/** Instruction pictures (start and end position, muscle highlighted) in `public/art/exercises/<id>.jpg`. Add the id here when a file is added. */
export const EXERCISE_IMAGES: readonly string[] = [
  'leg-press', 'machine-chest-press', 'lat-pulldown', 'db-shoulder-press', 'glute-bridge', 'plank',
  'goblet-squat', 'push-up', 'db-row', 'db-romanian-deadlift', 'db-lateral-raise', 'bird-dog',
];

export function exerciseImage(id: string): string | undefined {
  return EXERCISE_IMAGES.includes(id) ? `/art/exercises/${id}.jpg` : undefined;
}

/**
 * The band of each picture (in pixels of the 640 × 640 file) that holds the two poses; the rest is dark background. Showing only this band
 * makes the figure as big as the screen allows without cutting a head or a foot. Measured from the files by edge detection (dark hair is nearly the background colour, so brightness alone cuts heads off), plus a small margin: add a row when a picture is added.
 */
export const EXERCISE_CROP: Record<string, readonly [top: number, bottom: number]> = {
  'bird-dog': [211, 425],
  'db-lateral-raise': [65, 607],
  'db-romanian-deadlift': [14, 605],
  'db-row': [139, 542],
  'db-shoulder-press': [97, 543],
  'glute-bridge': [97, 514],
  'goblet-squat': [18, 611],
  'lat-pulldown': [101, 543],
  'leg-press': [98, 534],
  'machine-chest-press': [99, 543],
  'plank': [98, 472],
  'push-up': [205, 459]
};

/** CSS for showing the band of a picture: the box ratio and the vertical position inside the square file. */
export function exerciseCrop(id: string): { aspectRatio: string; objectPosition: string } {
  const [top, bottom] = EXERCISE_CROP[id] ?? [0, 640];
  const height = bottom - top;
  return { aspectRatio: `640 / ${height}`, objectPosition: `50% ${height >= 640 ? 0 : (top / (640 - height)) * 100}%` };
}
