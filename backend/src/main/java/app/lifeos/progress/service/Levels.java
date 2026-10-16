package app.lifeos.progress.service;

/** DOMAIN_RULES level formula: level = max(1, floor(sqrt(xp / 100))); level L >= 2 starts at 100 * L^2. */
public final class Levels {
    private Levels() {}

    public static int levelOf(long xp) {
        long level = (long) Math.floor(Math.sqrt(xp / 100.0));
        // Guard against floating point error at exact thresholds (e.g. 900 -> 3).
        while (100 * (level + 1) * (level + 1) <= xp) level++;
        while (level > 1 && 100 * level * level > xp) level--;
        return (int) Math.max(1, level);
    }

    public static int startXp(int level) { return level <= 1 ? 0 : 100 * level * level; }
    public static int nextXp(int level) { return 100 * (level + 1) * (level + 1); }
}
