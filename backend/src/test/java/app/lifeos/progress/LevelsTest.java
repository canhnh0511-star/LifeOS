package app.lifeos.progress;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.progress.service.Levels;
import org.junit.jupiter.api.Test;

class LevelsTest {
    @Test
    void thresholdsMatchTheDomainRules() {
        int[][] cases = {{0, 1}, {1, 1}, {399, 1}, {400, 2}, {899, 2}, {900, 3}, {1599, 3}, {1600, 4}, {2499, 4}, {2500, 5}, {10000, 10}};
        for (int[] c : cases) assertThat(Levels.levelOf(c[0])).as(c[0] + " XP").isEqualTo(c[1]);
    }

    @Test
    void levelBoundsBracketTheXp() {
        for (int xp = 0; xp < 6000; xp += 7) {
            int level = Levels.levelOf(xp);
            assertThat(xp).isGreaterThanOrEqualTo(Levels.startXp(level)).isLessThan(Levels.nextXp(level));
        }
        assertThat(Levels.startXp(1)).isZero();
        assertThat(Levels.nextXp(1)).isEqualTo(400);
        assertThat(Levels.startXp(5)).isEqualTo(2500);
    }
}
