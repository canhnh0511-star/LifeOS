package app.lifeos.daily;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "lifeos.daily-rewards.enabled=true")
class DailyRewardIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }
    private static LocalDate ago(int days) { return today().minusDays(days); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private UUID userId(TestBrowser b) throws Exception { return UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body())); }

    /** `count` daily habits worth 10 XP each in one goal, started `backdate` days ago. Returns their ids. */
    private List<String> habits(TestBrowser b, int count, int backdate) throws Exception {
        String goal = TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"HEALTH\",\"description\":\"\"}").body());
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String id = TestBrowser.idOf(b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"H" + i + "\",\"targetMinutes\":30,\"xpReward\":10"
                + ",\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"}").body());
            jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", backdate, UUID.fromString(id));
            jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", backdate, UUID.fromString(id));
            ids.add(id);
        }
        return ids;
    }
    private HttpResponse<String> done(TestBrowser b, String habit, LocalDate d) throws Exception { return ok(b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true)); }
    private HttpResponse<String> undone(TestBrowser b, String habit, LocalDate d) throws Exception { return ok(b.send("DELETE", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true)); }
    private HttpResponse<String> ok(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return r; }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private int events(UUID u, String type) { return jdbc.queryForObject("SELECT count(*) FROM xp_transactions WHERE user_id = ? AND event_type = ?", Integer.class, u, type); }
    private int ledger(UUID u) { return jdbc.queryForObject("SELECT coalesce(sum(amount),0) FROM xp_transactions WHERE user_id = ?", Integer.class, u); }
    private String dashboard(TestBrowser b, LocalDate d) throws Exception { return b.get("/api/v1/dashboard/today?date=" + d).body(); }
    private void assertTotalsMatchLedger(TestBrowser b) throws Exception {
        String progress = b.get("/api/v1/progress").body();
        assertThat(num(progress, "totalXp")).isEqualTo(ledger(userId(b)));
        int areaSum = 0;
        Matcher m = Pattern.compile("\"category\":\"[A-Z]+\",\"xp\":(\\d+)").matcher(progress);
        while (m.find()) areaSum += Integer.parseInt(m.group(1));
        assertThat(areaSum).isEqualTo(ledger(userId(b)));
    }

    @Test void chestsOpenAtHalfEightyAndAllAndPayPerArea() throws Exception {
        TestBrowser b = user();
        List<String> h = habits(b, 4, 0);
        assertThat(dashboard(b, today())).contains("\"dailyRewards\":[{\"tier\":\"WOOD\",\"threshold\":2,\"xp\":10,\"state\":\"LOCKED\",\"itemCode\":null}", "\"tier\":\"SILVER\",\"threshold\":4", "\"tier\":\"GOLD\",\"threshold\":4");

        HttpResponse<String> r1 = done(b, h.get(0), today());
        assertThat(num(r1.body(), "xpAwarded")).isEqualTo(10);
        assertThat(r1.body()).doesNotContain("DAILY_REWARD");

        HttpResponse<String> r2 = done(b, h.get(1), today());
        assertThat(r2.body()).contains("\"type\":\"DAILY_REWARD_GRANTED\",\"code\":\"WOOD\",\"xpDelta\":10");
        assertThat(num(r2.body(), "xpAwarded")).isEqualTo(10 + 10);
        assertThat(events(userId(b), "DAILY_REWARD_GRANT")).isEqualTo(5);
        assertThat(jdbc.queryForList("SELECT DISTINCT amount FROM xp_transactions WHERE event_type = 'DAILY_REWARD_GRANT' AND user_id = ?", Integer.class, userId(b))).containsExactly(2);

        done(b, h.get(2), today());
        HttpResponse<String> r4 = done(b, h.get(3), today());
        assertThat(r4.body()).contains("\"code\":\"SILVER\",\"xpDelta\":20", "\"code\":\"GOLD\",\"xpDelta\":40");
        assertThat(num(r4.body(), "xpAwarded")).isEqualTo(10 + 20 + 40);
        assertThat(dashboard(b, today())).doesNotContain("\"state\":\"LOCKED\"");
        assertTotalsMatchLedger(b);
    }

    @Test void repeatedCompletionNeverPaysTwice() throws Exception {
        TestBrowser b = user();
        List<String> h = habits(b, 2, 0);
        done(b, h.get(0), today());
        assertThat(events(userId(b), "DAILY_REWARD_GRANT")).isEqualTo(5);
        HttpResponse<String> again = done(b, h.get(0), today());
        assertThat(num(again.body(), "xpAwarded")).isZero();
        assertThat(events(userId(b), "DAILY_REWARD_GRANT")).isEqualTo(5);
    }

    @Test void undoRevokesTheChestAndCompletingAgainGrantsItAgain() throws Exception {
        TestBrowser b = user();
        List<String> h = habits(b, 2, 0);
        done(b, h.get(0), today());
        HttpResponse<String> undo = undone(b, h.get(0), today());
        assertThat(undo.body()).contains("\"type\":\"DAILY_REWARD_REVOKED\",\"code\":\"WOOD\",\"xpDelta\":-10");
        assertThat(num(undo.body(), "xpAwarded")).isEqualTo(-20);
        assertThat(ledger(userId(b))).isZero();
        assertThat(dashboard(b, today())).contains("\"state\":\"LOCKED\"");

        HttpResponse<String> again = done(b, h.get(0), today());
        assertThat(again.body()).contains("\"type\":\"DAILY_REWARD_GRANTED\",\"code\":\"WOOD\"");
        assertThat(ledger(userId(b))).isEqualTo(20);
        assertTotalsMatchLedger(b);
    }

    @Test void pastDayInsideTheWindowRevokesAndOutsideItIsLocked() throws Exception {
        TestBrowser b = user();
        List<String> h = habits(b, 2, 10);
        done(b, h.get(0), ago(3));
        assertThat(dashboard(b, ago(3))).contains("\"tier\":\"WOOD\",\"threshold\":1,\"xp\":10,\"state\":\"EARNED\"");
        undone(b, h.get(0), ago(3));
        assertThat(ledger(userId(b))).isZero();
        assertThat(b.send("PUT", "/api/v1/quests/" + h.get(0) + "/dates/" + ago(9) + "/completion", null, true).statusCode()).isEqualTo(422);
        assertThat(ledger(userId(b))).isZero();
    }

    @Test void twoQuestsFinishingTogetherOpenTheChestOnce() throws Exception {
        TestBrowser b = user();
        List<String> h = habits(b, 2, 0);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<HttpResponse<String>>> calls = new ArrayList<>();
            for (String id : h) calls.add(pool.submit(() -> done(b, id, today())));
            for (Future<HttpResponse<String>> f : calls) f.get();
        } finally { pool.shutdown(); }
        // 2 quests: WOOD at 1, SILVER and GOLD at 2. Each chest exactly once, five area events each.
        assertThat(events(userId(b), "DAILY_REWARD_GRANT")).isEqualTo(15);
        assertThat(ledger(userId(b))).isEqualTo(20 + 10 + 20 + 40);
        assertTotalsMatchLedger(b);
    }

    @Test void aDayWithoutQuestsHasNoChestAndNoStreak() throws Exception {
        TestBrowser b = user();
        String dash = dashboard(b, today());
        assertThat(dash).contains("\"dailyRewards\":[]", "\"dayStreak\":0");
    }

    @Test void dayStreakCountsDaysAtHalfAndStopsAtAMissedDay() throws Exception {
        TestBrowser b = user();
        List<String> h = habits(b, 2, 5);
        assertThat(num(dashboard(b, today()), "dayStreak")).isZero();
        // Yesterday and the day before: one of two quests is exactly 50%.
        done(b, h.get(0), ago(2));
        done(b, h.get(0), ago(1));
        assertThat(num(dashboard(b, today()), "dayStreak")).as("today is still open and does not break it").isEqualTo(2);
        done(b, h.get(1), today());
        assertThat(num(dashboard(b, today()), "dayStreak")).isEqualTo(3);
        // Taking away the day before leaves a gap: only today and yesterday remain.
        undone(b, h.get(0), ago(2));
        assertThat(num(dashboard(b, today()), "dayStreak")).isEqualTo(2);
        undone(b, h.get(0), ago(1));
        assertThat(num(dashboard(b, today()), "dayStreak")).isEqualTo(1);
    }
}
