package app.lifeos.achievement;

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
class AchievementIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String[] CATEGORIES = {"CAREER", "CREATIVITY", "HEALTH", "KNOWLEDGE", "MINDFULNESS"};
    private static LocalDate today() { return LocalDate.now(ZONE); }
    private static LocalDate ago(int days) { return today().minusDays(days); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private UUID userId(TestBrowser b) throws Exception { return UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body())); }

    /** A habit in `category` that started `backdate` days ago (so that many past days can be completed). */
    private String habit(TestBrowser b, String category, int xp, int backdate) throws Exception {
        String goal = TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"" + category + "\",\"description\":\"\"}").body());
        String habit = TestBrowser.idOf(b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"H\",\"targetMinutes\":30,\"xpReward\":" + xp
            + ",\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"}").body());
        jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", backdate, UUID.fromString(habit));
        jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", backdate, UUID.fromString(habit));
        return habit;
    }
    private HttpResponse<String> done(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true); }
    private HttpResponse<String> undone(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("DELETE", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true); }
    private HttpResponse<String> ok(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return r; }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private String achievement(TestBrowser b, String code) throws Exception {
        String all = b.get("/api/v1/achievements").body();
        int i = all.indexOf("\"code\":\"" + code + "\"");
        int end = all.indexOf("}", i);
        return all.substring(i, end);
    }
    private int events(UUID u, String type) { return jdbc.queryForObject("SELECT count(*) FROM xp_transactions WHERE user_id = ? AND event_type = ?", Integer.class, u, type); }
    private int ledger(UUID u) { return jdbc.queryForObject("SELECT coalesce(sum(amount),0) FROM xp_transactions WHERE user_id = ?", Integer.class, u); }
    private void assertTotalsMatchLedger(TestBrowser b) throws Exception {
        String progress = b.get("/api/v1/progress").body();
        assertThat(num(progress, "totalXp")).isEqualTo(ledger(userId(b)));
        int areaSum = 0;
        Matcher m = Pattern.compile("\"category\":\"[A-Z]+\",\"xp\":(\\d+)").matcher(progress);
        while (m.find()) areaSum += Integer.parseInt(m.group(1));
        assertThat(areaSum).isEqualTo(ledger(userId(b)));
    }
    /** Completes the last `days` days of a habit, oldest first, returning the final response. */
    private HttpResponse<String> completeRun(TestBrowser b, String habit, int days) throws Exception {
        HttpResponse<String> last = null;
        for (int i = days - 1; i >= 0; i--) last = ok(done(b, habit, ago(i)));
        return last;
    }

    @Test void catalogStartsLocked() throws Exception {
        TestBrowser b = user();
        String all = b.get("/api/v1/achievements").body();
        assertThat(all).contains("STREAK_7", "BALANCED", "COMEBACK").doesNotContain("\"status\":\"EARNED\"");
    }

    @Test void streakSevenIsGrantedOnceInTheHabitsOwnAreaAndRevokedOnUndo() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        String h = habit(b, "HEALTH", 10, 8);
        for (int i = 6; i >= 1; i--) assertThat(ok(done(b, h, ago(i))).body()).contains("\"effects\":[]");
        HttpResponse<String> seventh = ok(done(b, h, today()));
        assertThat(seventh.body()).contains("\"type\":\"ACHIEVEMENT_GRANTED\"", "\"code\":\"STREAK_7\"", "\"xpDelta\":20");
        assertThat(num(seventh.body(), "xpAwarded")).isEqualTo(30);              // 10 for the quest + 20 for the achievement
        assertThat(num(seventh.body(), "totalXp")).isEqualTo(6 * 10 + 30);
        assertThat(achievement(b, "STREAK_7")).contains("\"status\":\"EARNED\"").doesNotContain("\"earnedAt\":null");
        assertThat(jdbc.queryForObject("SELECT category FROM xp_transactions WHERE user_id = ? AND event_type = 'ACHIEVEMENT_GRANT'", String.class, u)).isEqualTo("HEALTH");
        assertTotalsMatchLedger(b);

        // Repeating the same request is idempotent: no re-evaluation, nothing awarded.
        HttpResponse<String> again = ok(done(b, h, today()));
        assertThat(num(again.body(), "xpAwarded")).isZero();
        assertThat(again.body()).contains("\"effects\":[]");
        // A further day keeps the condition true: still one grant.
        ok(done(b, h, ago(7)));
        assertThat(events(u, "ACHIEVEMENT_GRANT")).isEqualTo(1);
        assertThat(ok(undone(b, h, ago(7))).body()).contains("\"effects\":[]"); // streak is still 7 long, so nothing is revoked

        // Undo today: the streak falls to 6 inside the window, so the grant is revoked in the same request.
        HttpResponse<String> undo = ok(undone(b, h, today()));
        assertThat(undo.body()).contains("\"type\":\"ACHIEVEMENT_REVOKED\"", "\"xpDelta\":-20");
        assertThat(num(undo.body(), "xpAwarded")).isEqualTo(-30);
        assertThat(achievement(b, "STREAK_7")).contains("\"status\":\"LOCKED\"", "\"earnedAt\":null");
        assertThat(events(u, "ACHIEVEMENT_REVOKE")).isEqualTo(1);
        assertTotalsMatchLedger(b);

        // Earning it again opens cycle 2 and pays again.
        HttpResponse<String> back = ok(done(b, h, today()));
        assertThat(back.body()).contains("\"type\":\"ACHIEVEMENT_GRANTED\"");
        assertThat(jdbc.queryForObject("SELECT cycle FROM achievement_states WHERE user_id = ? AND code = 'STREAK_7'", Integer.class, u)).isEqualTo(2);
        assertThat(events(u, "ACHIEVEMENT_GRANT")).isEqualTo(2);
        assertTotalsMatchLedger(b);
    }

    @Test void anAchievementEarnedOutsideTheEditWindowIsLockedIn() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        String h = habit(b, "CAREER", 10, 8);
        completeRun(b, h, 7);
        assertThat(achievement(b, "STREAK_7")).contains("\"status\":\"EARNED\"");
        jdbc.update("UPDATE achievement_states SET earned_date = ? WHERE user_id = ? AND code = 'STREAK_7'", ago(8), u);
        HttpResponse<String> undo = ok(undone(b, h, today()));
        assertThat(undo.body()).contains("\"effects\":[]");
        assertThat(num(undo.body(), "xpAwarded")).isEqualTo(-10);
        assertThat(achievement(b, "STREAK_7")).contains("\"status\":\"EARNED\"");
        assertThat(events(u, "ACHIEVEMENT_REVOKE")).isZero();
        assertTotalsMatchLedger(b);
    }

    @Test void anEarnedAchievementSurvivesAStreakThatLapsedLaterWithoutAnyUndo() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        String h = habit(b, "CAREER", 10, 10);
        // History: a 9-day run (days -10..-2), earned on day -2; day -1 was missed and today is still pending, so the streak does not hold today.
        for (int i = 10; i >= 8; i--) {                                        // days outside the edit window are seeded as already done
            jdbc.update("INSERT INTO quest_instances (id, user_id, habit_id, scheduled_date, category, xp_reward, status, completed_at, cycle, created_at) VALUES (?,?,?,?,'CAREER',0,'COMPLETED',now(),1,now())",
                UUID.randomUUID(), u, UUID.fromString(h), ago(i));
        }
        for (int i = 7; i >= 2; i--) ok(done(b, h, ago(i)));
        String other = habit(b, "HEALTH", 10, 0);
        ok(done(b, other, today()));                                           // creates the achievement rows
        UUID state = jdbc.queryForObject("SELECT id FROM achievement_states WHERE user_id = ? AND code = 'STREAK_7'", UUID.class, u);
        jdbc.update("UPDATE achievement_states SET status = 'EARNED', cycle = 1, earned_date = ?, earned_at = now() WHERE id = ?", ago(2), state);
        jdbc.update("INSERT INTO xp_transactions (id, user_id, source_type, source_id, event_type, cycle, category, amount, scheduled_date, created_at) VALUES (?,?,'ACHIEVEMENT',?,'ACHIEVEMENT_GRANT',1,'CAREER',20,?,now())",
            UUID.randomUUID(), u, state, ago(2));

        String another = habit(b, "KNOWLEDGE", 10, 0);
        HttpResponse<String> r = ok(done(b, another, today()));                // an unrelated mutation re-evaluates achievements
        assertThat(r.body()).contains("\"effects\":[]");
        assertThat(num(r.body(), "xpAwarded")).isEqualTo(10);
        assertThat(achievement(b, "STREAK_7")).contains("\"status\":\"EARNED\"");
        assertThat(events(u, "ACHIEVEMENT_REVOKE")).isZero();
        assertTotalsMatchLedger(b);
    }

    @Test void balancedPaysFiveEventsOfSixAndRevokesThemAll() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        List<String> habits = new ArrayList<>();
        for (String c : CATEGORIES) habits.add(habit(b, c, 10, 0));
        for (int i = 0; i < 4; i++) assertThat(ok(done(b, habits.get(i), today())).body()).contains("\"effects\":[]");
        HttpResponse<String> last = ok(done(b, habits.get(4), today()));
        assertThat(last.body()).contains("\"code\":\"BALANCED\"", "\"xpDelta\":30");
        assertThat(num(last.body(), "xpAwarded")).isEqualTo(40);
        assertThat(events(u, "ACHIEVEMENT_GRANT")).isEqualTo(5);
        assertThat(jdbc.queryForList("SELECT amount FROM xp_transactions WHERE user_id = ? AND event_type = 'ACHIEVEMENT_GRANT'", Integer.class, u)).containsOnly(6);
        assertThat(num(last.body(), "totalXp")).isEqualTo(5 * 10 + 30);
        for (String area : CATEGORIES) assertThat(b.get("/api/v1/progress").body()).containsPattern("\"category\":\"" + area + "\",\"xp\":16");
        assertTotalsMatchLedger(b);

        HttpResponse<String> undo = ok(undone(b, habits.get(0), today()));
        assertThat(undo.body()).contains("\"type\":\"ACHIEVEMENT_REVOKED\"", "\"code\":\"BALANCED\"", "\"xpDelta\":-30");
        assertThat(events(u, "ACHIEVEMENT_REVOKE")).isEqualTo(5);
        assertThat(ledger(u)).isEqualTo(4 * 10);
        assertTotalsMatchLedger(b);
    }

    @Test void comebackNeedsABrokenStreakFollowedByThreeInARow() throws Exception {
        TestBrowser b = user();
        String h = habit(b, "KNOWLEDGE", 10, 8);
        for (int i : new int[] {6, 5, 4}) ok(done(b, h, ago(i)));              // run of 3
        for (int i : new int[] {2, 1}) assertThat(ok(done(b, h, ago(i))).body()).contains("\"effects\":[]"); // day -3 missed, new run at 2 of 3
        HttpResponse<String> r = ok(done(b, h, today()));
        assertThat(r.body()).contains("\"code\":\"COMEBACK\"", "\"xpDelta\":20");
        assertThat(jdbc.queryForObject("SELECT category FROM xp_transactions WHERE event_type = 'ACHIEVEMENT_GRANT' AND source_id = (SELECT id FROM achievement_states WHERE code = 'COMEBACK' AND user_id = ?)",
            String.class, userId(b))).isEqualTo("KNOWLEDGE");
        assertTotalsMatchLedger(b);
    }

    @Test void concurrentMutationsGrantExactlyOnce() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        String h = habit(b, "CAREER", 10, 8);
        for (int i = 6; i >= 2; i--) ok(done(b, h, ago(i)));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Callable<HttpResponse<String>>> calls = List.of(() -> done(b, h, ago(1)), () -> done(b, h, today()));
            int granted = 0;
            for (Future<HttpResponse<String>> f : pool.invokeAll(calls)) {
                HttpResponse<String> r = ok(f.get());
                if (r.body().contains("ACHIEVEMENT_GRANTED")) granted++;
            }
            assertThat(granted).isEqualTo(1);
        } finally { pool.shutdownNow(); }
        assertThat(events(u, "ACHIEVEMENT_GRANT")).isEqualTo(1);
        assertTotalsMatchLedger(b);
    }

    @Test void aBossMutationReevaluatesAchievementsToo() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        b.get("/api/v1/journeys/current");                                      // creates the journey, then places its first boss day on today
        jdbc.update("UPDATE journeys SET start_date = ? WHERE user_id = ?", ago(6), u);
        for (String c : CATEGORIES) ok(done(b, habit(b, c, 10, 0), today()));
        // MINDFULNESS now has 1 habit + the slime boss scheduled today: 1 of 2 done = 50%, so not balanced yet.
        assertThat(achievement(b, "BALANCED")).contains("\"status\":\"LOCKED\"");

        HttpResponse<String> defeat = ok(b.send("PUT", "/api/v1/bosses/boss-slime-of-inertia/completion", null, true));
        assertThat(defeat.body()).contains("\"code\":\"BALANCED\"", "\"xpDelta\":30");
        assertThat(num(defeat.body(), "xpAwarded")).isEqualTo(40 + 30);
        assertTotalsMatchLedger(b);

        HttpResponse<String> undo = ok(b.send("DELETE", "/api/v1/bosses/boss-slime-of-inertia/completion", null, true));
        assertThat(undo.body()).contains("\"type\":\"ACHIEVEMENT_REVOKED\"");
        assertThat(num(undo.body(), "xpAwarded")).isEqualTo(-70);
        assertThat(ledger(u)).isEqualTo(50);
    }

    @Test void aFailedAchievementWriteRollsTheWholeMutationBack() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        String h = habit(b, "CAREER", 10, 8);
        for (int i = 6; i >= 1; i--) ok(done(b, h, ago(i)));
        jdbc.execute("CREATE OR REPLACE FUNCTION fail_achievement() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'boom'; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER fail_achievement BEFORE INSERT ON xp_transactions FOR EACH ROW WHEN (NEW.event_type = 'ACHIEVEMENT_GRANT') EXECUTE FUNCTION fail_achievement()");
        try {
            assertThat(done(b, h, today()).statusCode()).isEqualTo(500);
        } finally {
            jdbc.execute("DROP TRIGGER fail_achievement ON xp_transactions");
            jdbc.execute("DROP FUNCTION fail_achievement()");
        }
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"status\":\"PENDING\"");
        assertThat(ledger(u)).isEqualTo(60);
        assertThat(achievement(b, "STREAK_7")).contains("\"status\":\"LOCKED\"");
    }

    @Test void achievementsBelongToTheUser() throws Exception {
        TestBrowser a = user(), other = user();
        completeRun(a, habit(a, "CAREER", 10, 8), 7);
        assertThat(achievement(a, "STREAK_7")).contains("\"status\":\"EARNED\"");
        assertThat(achievement(other, "STREAK_7")).contains("\"status\":\"LOCKED\"");
    }
}
