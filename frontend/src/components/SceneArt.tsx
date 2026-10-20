import { useState } from 'react';
import type { SceneKey } from '../domain/scene';

/**
 * Anime backdrop of a card on Today (`public/art/scenes/<scene>.jpg`). Decorative, so hidden from assistive tech: the card's own
 * text says what the item is. A missing or broken picture falls back to a plain gradient, never a broken-image icon.
 */
export function SceneArt({ scene, className = '' }: { scene: SceneKey; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={`scene-art scene-art-fallback ${className}`} aria-hidden="true" data-scene={scene}/>;
  return <img className={`scene-art ${className}`} src={`${import.meta.env.BASE_URL}art/scenes/${scene.toLowerCase()}.jpg`} alt="" aria-hidden="true" loading="lazy" decoding="async" data-scene={scene} onError={() => setFailed(true)}/>;
}
