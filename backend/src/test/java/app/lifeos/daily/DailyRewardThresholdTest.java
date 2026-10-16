package app.lifeos.daily;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DailyRewardThresholdTest {
    @Test void roundsUpForOneToTenQuests() {
        int[][] expected = {{1, 1, 1}, {1, 2, 2}, {2, 3, 3}, {2, 4, 4}, {3, 4, 5}, {3, 5, 6}, {4, 6, 7}, {4, 7, 8}, {5, 8, 9}, {5, 8, 10}};
        for (int n = 1; n <= 10; n++) {
            int[] want = expected[n - 1];
            assertThat(new int[] {DailyRewardService.threshold(n, 50), DailyRewardService.threshold(n, 80), DailyRewardService.threshold(n, 100)}).as("n=%d", n).containsExactly(want);
        }
    }
}
