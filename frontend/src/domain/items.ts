import type { GoalCategory } from '../api/types';

export type ItemSlot = 'WEAPON' | 'HEAD' | 'CLOAK' | 'FEET' | 'RELIC';
export type ItemRarity = 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export interface CatalogItem { code: string; name: string; story: string; slot: ItemSlot; rarity: ItemRarity; area: GoalCategory; artKey: string; }

/** Mirrors the backend catalog (ADR-034); the mock uses it, the real API returns the same entries. */
export const ITEM_CATALOG: CatalogItem[] = [
  { code: 'LATE_WIND_TREADS', name: 'Giày Bước Gió Muộn', story: 'Dành cho người xuất phát muộn nhưng không bao giờ bỏ cuộc.', slot: 'FEET', rarity: 'UNCOMMON', area: 'HEALTH', artKey: 'late-wind-treads' },
  { code: 'WOLF_FANG_SWORD', name: 'Kiếm Nanh Sói', story: 'Rèn từ chiếc nanh của con sói đầu tiên sống sót qua mùa đông dài nhất. Càng lạnh càng sắc.', slot: 'WEAPON', rarity: 'RARE', area: 'HEALTH', artKey: 'wolf-fang-sword' },
  { code: 'WANING_MOON_CLOAK', name: 'Áo Choàng Trăng Khuyết', story: 'Dệt từ ánh trăng của đêm người lữ hành bắt đầu hành trình.', slot: 'CLOAK', rarity: 'RARE', area: 'MINDFULNESS', artKey: 'waning-moon-cloak' },
  { code: 'BLANK_PAGES_CHRONICLE', name: 'Sử Ký Trang Trắng', story: 'Cuốn sách tự viết thêm một trang mỗi khi chủ nhân học được điều mới.', slot: 'RELIC', rarity: 'EPIC', area: 'KNOWLEDGE', artKey: 'blank-pages-chronicle' },
  { code: 'ASHEN_EMBER_CROWN', name: 'Vương Miện Tàn Tro', story: 'Vương miện vỡ của một đế chế cháy rụi; tro vẫn còn âm ỉ.', slot: 'HEAD', rarity: 'EPIC', area: 'CAREER', artKey: 'ashen-ember-crown' },
  { code: 'NAMELESS_KING_MIRROR', name: 'Gương Vua Vô Danh', story: 'Gương của một vị vua bị xoá tên khỏi lịch sử. Soi vào chỉ thấy chiếc vương miện, không thấy mặt.', slot: 'RELIC', rarity: 'LEGENDARY', area: 'MINDFULNESS', artKey: 'nameless-king-mirror' },
  { code: 'SWEATBAND_OF_DAWN', name: 'Băng Đô Bình Minh', story: 'Thấm mồ hôi của những buổi tập khi cả thành phố còn ngủ.', slot: 'HEAD', rarity: 'UNCOMMON', area: 'HEALTH', artKey: 'sweatband-of-dawn' },
  { code: 'IRON_GRIP_GAUNTLETS', name: 'Găng Nắm Sắt', story: 'Giữ chặt thanh tạ qua cả những set cuối cùng, khi tay đã run.', slot: 'WEAPON', rarity: 'RARE', area: 'HEALTH', artKey: 'iron-grip-gauntlets' },
  { code: 'GYM_FLOOR_MANTLE', name: 'Áo Choàng Sàn Tập', story: 'Dệt từ chiếc khăn lau của người đến phòng tập đều đặn nhất năm.', slot: 'CLOAK', rarity: 'RARE', area: 'HEALTH', artKey: 'gym-floor-mantle' },
  { code: 'HOURGLASS_OF_REPS', name: 'Đồng Hồ Cát Của Rep', story: 'Mỗi hạt cát rơi là một rep; chiếc đồng hồ không bao giờ cạn với người kiên trì.', slot: 'RELIC', rarity: 'EPIC', area: 'HEALTH', artKey: 'hourglass-of-reps' }
];
export const SLOT_LABEL: Record<ItemSlot, string> = { WEAPON: 'Vũ khí', HEAD: 'Đầu', CLOAK: 'Áo choàng', FEET: 'Giày', RELIC: 'Cổ vật' };
export const RARITY_LABEL: Record<ItemRarity, string> = { UNCOMMON: 'Khá', RARE: 'Hiếm', EPIC: 'Sử thi', LEGENDARY: 'Huyền thoại' };
export const itemName = (code: string) => ITEM_CATALOG.find(i => i.code === code)?.name ?? code;
/** Rarities a chest tier can drop: the bigger the chest, the rarer the pool. */
export const POOL: Record<string, ItemRarity[]> = { WOOD: ['UNCOMMON', 'RARE'], SILVER: ['RARE', 'EPIC'], GOLD: ['EPIC', 'LEGENDARY'] };
/** Which chests can drop an item of this rarity, as readable text for the locked state. */
export const dropHint = (rarity: ItemRarity): string => {
  const tiers = Object.entries(POOL).filter(([, r]) => r.includes(rarity)).map(([t]) => ({ WOOD: 'Gỗ', SILVER: 'Bạc', GOLD: 'Vàng' } as Record<string, string>)[t]);
  return `Có thể rơi từ rương ${tiers.join(' hoặc ')}. Hoàn thành nhiệm vụ trong ngày để mở rương.`;
};
