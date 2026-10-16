import { useState } from 'react';
import { Package } from 'lucide-react';

/** Item picture with a plain fallback so a missing image never breaks the layout. */
export function ItemArt({ artKey, name }: { artKey: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="item-art item-art-fallback" aria-hidden="true"><Package size={28}/></span>
    : <img className="item-art" src={`${import.meta.env.BASE_URL}items/${artKey}.jpg`} alt={name} loading="lazy" onError={() => setFailed(true)}/>;
}
