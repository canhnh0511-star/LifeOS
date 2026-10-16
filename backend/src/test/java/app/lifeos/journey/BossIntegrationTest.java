package app.lifeos.journey;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BossIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String SLIME = "boss-slime-of-inertia";   // MINDFULNESS, level 1, 40 XP
    private static final String TROLL = "boss-troll-of-burnout";   // HEALTH, level 2, 65 XP
    private static LocalDate today() { return LocalDate.now(ZONE); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private HttpResponse<String> defeat(TestBrowser b, String boss) throws Exception { return b.send("PUT", "/api/v1/bosses/" + boss + "/completion", null, true); }
    private HttpResponse<String> undo(TestBrowser b, String boss) throws Exception { return b.send("DELETE", "/api/v1/bosses/" + boss + "/completion", null, true); }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private static String bossJson(String journey, String bossId) {
        int i = journey.indexOf("\"id\":\"" + bossId + "\"");
        if (i < 0) throw new IllegalStateException(bossId + " missing");
        int end = journey.indexOf("\"badge\"", i);
        return journey.substring(i, end);
    }
    private String boss(TestBrowser b, String bossId) throws Exception { return bossJson(b.get("/api/v1/journeys/current").body(), bossId); }
    private boolean badgeEarned(TestBrowser b, int chapter) throws Exception {
        return b.get("/api/v1/journeys/current").body().contains("\"code\":\"CHAPTER_" + chapter + "\"") && Pattern.compile("\"code\":\"CHAPTER_" + chapter + "\",\"name\":\"[^\"]*\",\"earned\":true").matcher(b.get("/api/v1/journeys/current").body()).find();
    }
    private UUID userId(TestBrowser b) throws Exception { return UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body())); }
    private int bossLedgerRows(UUID user) { return jdbc.queryForObject("SELECT count(*) FROM xp_transactions WHERE user_id = ? AND source_type = 'BOSS'", Integer.class, user); }
    private int bossLedgerSum(UUID user) { return jdbc.queryForObject("SELECT coalesce(sum(amount),0) FROM xp_transactions WHERE user_id = ? AND source_type = 'BOSS'", Integer.class, user); }
    private int totalLedger(UUID user) { return jdbc.queryForObject("SELECT coalesce(sum(amount),0) FROM xp_transactions WHERE user_id = ?", Integer.class, user); }

    /** Gives the user `quests` x `xp` HEALTH XP by completing one habit on that many recent days; returns the habit id. */
    private String earnHealthXp(TestBrowser b, int quests, int xp) throws Exception {
        String goal = TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"HEALTH\",\"description\":\"\"}").body());
        String habit = TestBrowser.idOf(b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"H\",\"targetMinutes\":30,\"xpReward\":" + xp
            + ",\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"}").body());
        jdbc.update("UPDATE habits SET start_date = start_date - 7 WHERE id = ?", UUID.fromString(habit));
        jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - 7 WHERE habit_id = ?", UUID.fromString(habit));
        for (int i = 0; i < quests; i++) {
            HttpResponse<String> q = questCall(b, "PUT", habit, today().minusDays(i));
            assertThat(q.statusCode()).as(q.body()).isEqualTo(200);
        }
        return habit;
    }
    private HttpResponse<String> questCall(TestBrowser b, String method, String habit, LocalDate d) throws Exception {
        return b.send(method, "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true);
    }

    @Test void mutationsRequireASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(defeat(anon, SLIME).statusCode()).isEqualTo(401);
        assertThat(undo(anon, SLIME).statusCode()).isEqualTo(401);
    }

    @Test void unknownBossIs404() throws Exception {
        TestBrowser b = user();
        assertThat(defeat(b, "boss-nope").statusCode()).isEqualTo(404);
        assertThat(undo(b, "boss-nope").statusCode()).isEqualTo(404);
    }

    @Test void defeatingAwardsTheRewardOnceAndJourneyShowsIt() throws Exception {
        TestBrowser b = user();
        assertThat(boss(b, SLIME)).contains("\"status\":\"AVAILABLE\"", "\"defeatedDate\":null");
        assertThat(badgeEarned(b, 1)).isFalse();

        HttpResponse<String> r = defeat(b, SLIME);
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        assertThat(r.body()).contains("\"bossId\":\"" + SLIME + "\"", "\"status\":\"DEFEATED\"", "\"xpAwarded\":40", "\"totalXp\":40", "\"effects\":[]");
        assertThat(boss(b, SLIME)).contains("\"status\":\"DEFEATED\"", "\"defeatedDate\":\"" + today() + "\"").doesNotContain("\"defeatedAt\":null");
        assertThat(badgeEarned(b, 1)).isTrue();
        assertThat(b.get("/api/v1/progress").body()).contains("\"totalXp\":40").containsPattern("\"category\":\"MINDFULNESS\",\"xp\":40");

        HttpResponse<String> again = defeat(b, SLIME);
        assertThat(num(again.body(), "xpAwarded")).isZero();
        assertThat(again.body()).contains("\"status\":\"DEFEATED\"", "\"totalXp\":40");
        assertThat(bossLedgerRows(userId(b))).isEqualTo(1);
    }

    @Test void undoRevertsRepeatedUndoIsNoOpAndRedefeatStartsANewCycle() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        defeat(b, SLIME);
        HttpResponse<String> u1 = undo(b, SLIME);
        assertThat(u1.body()).contains("\"status\":\"AVAILABLE\"", "\"xpAwarded\":-40", "\"totalXp\":0");
        assertThat(boss(b, SLIME)).contains("\"status\":\"AVAILABLE\"", "\"defeatedDate\":null", "\"defeatedAt\":null");
        assertThat(badgeEarned(b, 1)).isFalse();
        assertThat(num(undo(b, SLIME).body(), "xpAwarded")).isZero();
        assertThat(bossLedgerRows(u)).isEqualTo(2);
        assertThat(bossLedgerSum(u)).isZero();

        assertThat(num(defeat(b, SLIME).body(), "xpAwarded")).isEqualTo(40);
        assertThat(jdbc.queryForObject("SELECT cycle FROM boss_states WHERE user_id = ? AND boss_code = 'SLIME_OF_INERTIA'", Integer.class, u)).isEqualTo(2);
        assertThat(bossLedgerRows(u)).isEqualTo(3);
        assertThat(bossLedgerSum(u)).isEqualTo(40);
        assertThat(totalLedger(u)).isEqualTo(40);
    }

    @Test void lockedBossIsRejectedAndLeavesNothingBehind() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = defeat(b, TROLL);
        assertThat(r.statusCode()).isEqualTo(409);
        assertThat(r.body()).contains("\"code\":\"BOSS_LOCKED\"");
        assertThat(boss(b, TROLL)).contains("\"status\":\"LOCKED\"");
        assertThat(bossLedgerRows(userId(b))).isZero();
        assertThat(num(undo(b, TROLL).body(), "xpAwarded")).isZero(); // undoing a boss that was never defeated is a no-op
        assertThat(jdbc.queryForObject("SELECT count(*) FROM boss_states WHERE user_id = ?", Integer.class, userId(b))).isZero(); // no row for a boss never fought
    }

    @Test void concurrentDefeatsAwardExactlyOnce() throws Exception {
        TestBrowser b = user();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<HttpResponse<String>>> calls = new ArrayList<>();
            for (int i = 0; i < 8; i++) calls.add(() -> defeat(b, SLIME));
            int awarded = 0, zero = 0;
            for (Future<HttpResponse<String>> f : pool.invokeAll(calls)) {
                HttpResponse<String> r = f.get();
                assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
                if (num(r.body(), "xpAwarded") == 40) awarded++; else if (num(r.body(), "xpAwarded") == 0) zero++;
            }
            assertThat(awarded).isEqualTo(1);
            assertThat(zero).isEqualTo(7);
        } finally { pool.shutdownNow(); }
        assertThat(bossLedgerRows(userId(b))).isEqualTo(1);
        assertThat(bossLedgerSum(userId(b))).isEqualTo(40);
    }

    @Test void bossStateBelongsToTheUser() throws Exception {
        TestBrowser a = user(), other = user();
        defeat(a, SLIME);
        assertThat(boss(other, SLIME)).contains("\"status\":\"AVAILABLE\"");
        assertThat(num(undo(other, SLIME).body(), "xpAwarded")).isZero();
        assertThat(boss(a, SLIME)).contains("\"status\":\"DEFEATED\"");
        assertThat(num(other.get("/api/v1/progress").body(), "totalXp")).isZero();
    }

    @Test void defeatedBossStaysDefeatedWhenTheAreaLevelDropsAfterwards() throws Exception {
        TestBrowser b = user();
        String habit = earnHealthXp(b, 5, 100);                       // 500 HEALTH XP -> level 2
        assertThat(boss(b, TROLL)).contains("\"status\":\"AVAILABLE\"");
        assertThat(num(defeat(b, TROLL).body(), "xpAwarded")).isEqualTo(65);
        for (int i = 0; i < 5; i++) assertThat(questCall(b, "DELETE", habit, today().minusDays(i)).statusCode()).isEqualTo(200);

        String troll = boss(b, TROLL);                                // HEALTH XP is 65 now: level 1 < required 2
        assertThat(troll).contains("\"status\":\"DEFEATED\"", "\"currentAreaLevel\":1");
        assertThat(badgeEarned(b, 3)).isTrue();
        assertThat(num(defeat(b, TROLL).body(), "xpAwarded")).isZero();
        assertThat(totalLedger(userId(b))).isEqualTo(65);
    }

    @Test void undoIsRefusedAfterTheSevenDayWindow() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        defeat(b, SLIME);
        jdbc.update("UPDATE boss_states SET defeated_date = ? WHERE user_id = ?", today().minusDays(8), u);
        HttpResponse<String> r = undo(b, SLIME);
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("\"code\":\"QUEST_TOO_OLD\"");
        assertThat(boss(b, SLIME)).contains("\"status\":\"DEFEATED\"");
        jdbc.update("UPDATE boss_states SET defeated_date = ? WHERE user_id = ?", today().minusDays(7), u);
        assertThat(num(undo(b, SLIME).body(), "xpAwarded")).isEqualTo(-40);
    }

    @Test void analyticsCountsTheBossOnTheDayItWasDefeated() throws Exception {
        TestBrowser b = user();
        String before = b.get("/api/v1/analytics/weekly").body();
        defeat(b, SLIME);
        String after = b.get("/api/v1/analytics/weekly").body();
        assertThat(num(after, "completedCount")).isEqualTo(num(before, "completedCount") + 1);
        assertThat(num(after, "earnedXp")).isEqualTo(40);
        assertThat(after).containsPattern("\"category\":\"MINDFULNESS\",\"scheduled\":\\d+,\"completed\":1");
        undo(b, SLIME);
        assertThat(num(b.get("/api/v1/analytics/weekly").body(), "completedCount")).isEqualTo(num(before, "completedCount"));
    }

    @Test void aFailedLedgerWriteRollsTheWholeMutationBack() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        defeat(b, SLIME);
        jdbc.execute("CREATE OR REPLACE FUNCTION fail_boss_revert() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'boom'; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER fail_boss_revert BEFORE INSERT ON xp_transactions FOR EACH ROW WHEN (NEW.event_type = 'BOSS_REVERT') EXECUTE FUNCTION fail_boss_revert()");
        try {
            assertThat(undo(b, SLIME).statusCode()).isEqualTo(500);
        } finally {
            jdbc.execute("DROP TRIGGER fail_boss_revert ON xp_transactions");
            jdbc.execute("DROP FUNCTION fail_boss_revert()");
        }
        assertThat(boss(b, SLIME)).contains("\"status\":\"DEFEATED\"");
        assertThat(bossLedgerRows(u)).isEqualTo(1);
        assertThat(totalLedger(u)).isEqualTo(40);
    }

    @Test void bossesDoNotTouchTheStreak() throws Exception {
        TestBrowser b = user();
        String before = b.get("/api/v1/progress").body();
        defeat(b, SLIME);
        String after = b.get("/api/v1/progress").body();
        assertThat(num(after, "currentStreak")).isEqualTo(num(before, "currentStreak"));
        assertThat(num(after, "longestStreak")).isEqualTo(num(before, "longestStreak"));
    }
}
