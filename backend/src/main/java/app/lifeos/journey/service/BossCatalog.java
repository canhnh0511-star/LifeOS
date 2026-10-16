package app.lifeos.journey.service;

import java.util.List;

/** Campaign configuration, kept identical to frontend/src/domain/bosses.ts. Adding a boss is a data change only. */
final class BossCatalog {
    private BossCatalog() {}

    record Chapter(int index, String title, String badgeName, int fromDay, int toDay) {}
    record Boss(String code, int chapter, String name, String category, int targetMinutes, int xpReward, int tier, int requiredLevel, String artKey) {}

    static final List<Chapter> CHAPTERS = List.of(
        new Chapter(1, "Khởi động", "Huy hiệu Người khởi hành", 1, 7),
        new Chapter(2, "Vào nhịp", "Huy hiệu Vào guồng", 8, 21),
        new Chapter(3, "Bền bỉ", "Huy hiệu Kiên cường", 22, 44),
        new Chapter(4, "Chinh phục", "Huy hiệu Kẻ chinh phục", 45, 66));

    static final List<Boss> BOSSES = List.of(
        new Boss("SLIME_OF_INERTIA", 1, "Slime of Inertia", "MINDFULNESS", 60, 40, 1, 1, "slime-of-inertia"),
        new Boss("GARGOYLE_OF_DISTRACTION", 2, "Gargoyle of Distraction", "KNOWLEDGE", 90, 50, 2, 1, "gargoyle-of-distraction"),
        new Boss("TROLL_OF_BURNOUT", 3, "Troll of Burnout", "HEALTH", 120, 65, 3, 2, "troll-of-burnout"),
        new Boss("DRAGON_OF_PROCRASTINATION", 4, "Dragon of Procrastination", "CAREER", 180, 100, 5, 3, "dragon-of-procrastination"));

    static Boss bossOf(int chapter) { return BOSSES.stream().filter(b -> b.chapter() == chapter).findFirst().orElseThrow(); }
}
