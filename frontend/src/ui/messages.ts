import type { RewardEffectDto } from '../api/types';
import { ACHIEVEMENT_CATALOG } from '../domain/achievements';
import { tierName } from '../domain/dailyRewards';
import { itemName } from '../domain/items';

const achievementName = (code: string) => ACHIEVEMENT_CATALOG.find(a => a.code === code)?.name ?? code;
/** Appends granted/revoked achievements to a toast so no XP change is silent. */
export function withEffects(message: string, effects?: RewardEffectDto[]): string {
  const parts = (effects ?? []).map(e => e.type === 'ITEM_DROPPED' ? `Nhận vật phẩm "${itemName(e.code)}"` : e.type === 'ITEM_REVOKED' ? `Mất vật phẩm "${itemName(e.code)}"` : e.type.startsWith('DAILY_REWARD') ? (e.xpDelta >= 0 ? `Mở ${tierName(e.code)} (+${e.xpDelta} XP)` : `Mất ${tierName(e.code)} (${e.xpDelta} XP)`) : e.xpDelta >= 0 ? `Mở khóa thành tựu "${achievementName(e.code)}" (+${e.xpDelta} XP)` : `Mất thành tựu "${achievementName(e.code)}" (${e.xpDelta} XP)`);
  return parts.length ? `${message} · ${parts.join(' · ')}` : message;
}
