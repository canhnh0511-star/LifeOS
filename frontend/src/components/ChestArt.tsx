import { useState } from 'react';
import { Gift } from 'lucide-react';

/** Chest picture by tier and state; falls back to a plain icon so a missing image never breaks the layout. */
export function ChestArt({ tier, open, size }: { tier: string; open: boolean; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Gift size={Math.round(size * 0.6)} aria-hidden="true"/>;
  return <img className="chest-art" width={size} height={size} src={`${import.meta.env.BASE_URL}chests/${tier.toLowerCase()}-${open ? 'open' : 'closed'}.jpg`} alt="" aria-hidden="true" onError={() => setFailed(true)}/>;
}
