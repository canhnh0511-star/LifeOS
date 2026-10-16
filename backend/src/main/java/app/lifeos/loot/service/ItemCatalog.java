package app.lifeos.loot.service;

import java.util.List;
import java.util.Optional;

/** The item catalog (ADR-034). Names, stories and art keys are original. `artKey` names `frontend/public/items/<artKey>.jpg`. */
public final class ItemCatalog {
    private ItemCatalog() {}

    public enum Slot { WEAPON, HEAD, CLOAK, FEET, RELIC }
    public enum Rarity { UNCOMMON, RARE, EPIC, LEGENDARY }

    public record Item(String code, String name, String story, Slot slot, Rarity rarity, String area, String artKey) {}

    public static final List<Item> ITEMS = List.of(
        new Item("LATE_WIND_TREADS", "Giày Bước Gió Muộn", "Dành cho người xuất phát muộn nhưng không bao giờ bỏ cuộc.", Slot.FEET, Rarity.UNCOMMON, "HEALTH", "late-wind-treads"),
        new Item("WOLF_FANG_SWORD", "Kiếm Nanh Sói", "Rèn từ chiếc nanh của con sói đầu tiên sống sót qua mùa đông dài nhất. Càng lạnh càng sắc.", Slot.WEAPON, Rarity.RARE, "HEALTH", "wolf-fang-sword"),
        new Item("WANING_MOON_CLOAK", "Áo Choàng Trăng Khuyết", "Dệt từ ánh trăng của đêm người lữ hành bắt đầu hành trình.", Slot.CLOAK, Rarity.RARE, "MINDFULNESS", "waning-moon-cloak"),
        new Item("BLANK_PAGES_CHRONICLE", "Sử Ký Trang Trắng", "Cuốn sách tự viết thêm một trang mỗi khi chủ nhân học được điều mới.", Slot.RELIC, Rarity.EPIC, "KNOWLEDGE", "blank-pages-chronicle"),
        new Item("ASHEN_EMBER_CROWN", "Vương Miện Tàn Tro", "Vương miện vỡ của một đế chế cháy rụi; tro vẫn còn âm ỉ.", Slot.HEAD, Rarity.EPIC, "CAREER", "ashen-ember-crown"),
        new Item("NAMELESS_KING_MIRROR", "Gương Vua Vô Danh", "Gương của một vị vua bị xoá tên khỏi lịch sử. Soi vào chỉ thấy chiếc vương miện, không thấy mặt.", Slot.RELIC, Rarity.LEGENDARY, "MINDFULNESS", "nameless-king-mirror"));

    public static Optional<Item> find(String code) { return ITEMS.stream().filter(i -> i.code().equals(code)).findFirst(); }

    /** Rarities a chest tier can drop: the bigger the chest, the rarer the pool. */
    public static List<Rarity> poolFor(String tier) {
        return switch (tier) {
            case "WOOD" -> List.of(Rarity.UNCOMMON, Rarity.RARE);
            case "SILVER" -> List.of(Rarity.RARE, Rarity.EPIC);
            default -> List.of(Rarity.EPIC, Rarity.LEGENDARY);
        };
    }
}
