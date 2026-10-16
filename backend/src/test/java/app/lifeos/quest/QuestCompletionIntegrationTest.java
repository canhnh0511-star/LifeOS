package app.lifeos.quest;

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
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class QuestCompletionIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private String goal(TestBrowser b, String category) throws Exception {
        HttpResponse<String> r = b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"" + category + "\",\"description\":\"\"}");
        assertThat(r.statusCode()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private String habit(TestBrowser b, String goalId, int xp) throws Exception {
        HttpResponse<String> r = b.post("/api/v1/habits", "{\"goalId\":\"" + goalId + "\",\"title\":\"H\",\"targetMinutes\":30,\"xpReward\":" + xp
            + ",\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"}");
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private static String url(String habit, LocalDate d) { return "/api/v1/quests/" + habit + "/dates/" + d + "/completion"; }
    private HttpResponse<String> put(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("PUT", url(habit, d), null, true); }
    private HttpResponse<String> del(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("DELETE", url(habit, d), null, true); }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private int ledgerRows(String habit) {
        return jdbc.queryForObject("SELECT count(*) FROM xp_transactions x JOIN quest_instances q ON q.id = x.source_id WHERE q.habit_id = ?", Integer.class, UUID.fromString(habit));
    }
    private int ledgerSum(String habit) {
        return jdbc.queryForObject("SELECT coalesce(sum(x.amount),0) FROM xp_transactions x JOIN quest_instances q ON q.id = x.source_id WHERE q.habit_id = ?", Integer.class, UUID.fromString(habit));
    }
    /** Lets a test place a habit in the past: moves its start and first schedule version back. */
    private void backdate(String habit, int days) {
        jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", days, UUID.fromString(habit));
        jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", days, UUID.fromString(habit));
    }

    @Test
    void mutationsRequireASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(put(anon, UUID.randomUUID().toString(), today()).statusCode()).isEqualTo(401);
        assertThat(del(anon, UUID.randomUUID().toString(), today()).statusCode()).isEqualTo(401);
    }

    @Test
    void completingAwardsTheRewardOnceAndProgressComesFromTheLedger() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "HEALTH"), 35);
        HttpResponse<String> r = put(b, h, today());
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        assertThat(r.body()).contains("\"status\":\"COMPLETED\"", "\"xpAwarded\":35", "\"totalXp\":35", "\"level\":1", "\"effects\":[]");

        String dash = b.get("/api/v1/dashboard/today").body();
        assertThat(dash).contains("\"completedCount\":1", "\"earnedXpToday\":35", "\"totalXp\":35")
            .containsPattern("\"category\":\"HEALTH\",\"xp\":35")
            .containsPattern("\"category\":\"CAREER\",\"xp\":0");
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"status\":\"COMPLETED\"").doesNotContain("\"completedAt\":null");
    }

    @Test
    void repeatedCompleteAndRepeatedUndoAreNoOps() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 50);
        assertThat(num(put(b, h, today()).body(), "xpAwarded")).isEqualTo(50);
        HttpResponse<String> again = put(b, h, today());
        assertThat(num(again.body(), "xpAwarded")).isZero();
        assertThat(again.body()).contains("\"status\":\"COMPLETED\"", "\"totalXp\":50");
        assertThat(ledgerRows(h)).isEqualTo(1);

        assertThat(num(del(b, h, today()).body(), "xpAwarded")).isEqualTo(-50);
        HttpResponse<String> undoAgain = del(b, h, today());
        assertThat(num(undoAgain.body(), "xpAwarded")).isZero();
        assertThat(undoAgain.body()).contains("\"status\":\"PENDING\"", "\"totalXp\":0");
        assertThat(ledgerRows(h)).isEqualTo(2);
        assertThat(ledgerSum(h)).isZero();
    }

    @Test
    void undoingAQuestThatWasNeverCompletedChangesNothing() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 50);
        HttpResponse<String> r = del(b, h, today());
        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.body()).contains("\"status\":\"PENDING\"", "\"xpAwarded\":0");
        assertThat(ledgerRows(h)).isZero();
    }

    @Test
    void completeAfterUndoStartsANewCycleWithItsOwnLedgerEvents() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 20);
        put(b, h, today()); del(b, h, today());
        HttpResponse<String> r = put(b, h, today());
        assertThat(num(r.body(), "xpAwarded")).isEqualTo(20);
        assertThat(num(r.body(), "totalXp")).isEqualTo(20);
        assertThat(jdbc.queryForList("SELECT x.cycle || ':' || x.event_type FROM xp_transactions x JOIN quest_instances q ON q.id = x.source_id WHERE q.habit_id = ? ORDER BY x.created_at, x.amount",
            String.class, UUID.fromString(h))).containsExactlyInAnyOrder("1:QUEST_COMPLETE", "1:QUEST_REVERT", "2:QUEST_COMPLETE");
    }

    @Test
    void undoReversesExactlyWhatWasAwarded_evenIfTheHabitRewardChangedLater() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 35);
        put(b, h, today());
        jdbc.update("UPDATE habits SET xp_reward = 100 WHERE id = ?", UUID.fromString(h));
        assertThat(num(del(b, h, today()).body(), "xpAwarded")).isEqualTo(-35);
        assertThat(ledgerSum(h)).isZero();
    }

    @Test
    void zeroRewardHabitChangesStateButWritesNoLedgerEvent() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "MINDFULNESS"), 0);
        HttpResponse<String> r = put(b, h, today());
        assertThat(r.body()).contains("\"status\":\"COMPLETED\"", "\"xpAwarded\":0");
        assertThat(del(b, h, today()).body()).contains("\"status\":\"PENDING\"", "\"xpAwarded\":0");
        assertThat(ledgerRows(h)).isZero();
    }

    @Test
    void concurrentIdenticalRequestsAwardExactlyOnce() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 40); // not materialized yet: the race includes first creation
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<HttpResponse<String>>> calls = new ArrayList<>();
            for (int i = 0; i < 8; i++) calls.add(() -> put(b, h, today()));
            int awarded = 0, zero = 0;
            for (Future<HttpResponse<String>> f : pool.invokeAll(calls)) {
                HttpResponse<String> r = f.get();
                assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
                if (num(r.body(), "xpAwarded") == 40) awarded++; else if (num(r.body(), "xpAwarded") == 0) zero++;
            }
            assertThat(awarded).isEqualTo(1);
            assertThat(zero).isEqualTo(7);
        } finally { pool.shutdownNow(); }
        assertThat(ledgerRows(h)).isEqualTo(1);
        assertThat(ledgerSum(h)).isEqualTo(40);
    }

    @Test
    void concurrentCompleteAndUndoNeverLeaveTheLedgerOutOfStep() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 30);
        put(b, h, today());
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<HttpResponse<String>>> calls = new ArrayList<>();
            for (int i = 0; i < 12; i++) { int n = i; calls.add(() -> n % 2 == 0 ? del(b, h, today()) : put(b, h, today())); }
            for (Future<HttpResponse<String>> f : pool.invokeAll(calls)) assertThat(f.get().statusCode()).isEqualTo(200);
        } finally { pool.shutdownNow(); }
        String status = jdbc.queryForObject("SELECT status FROM quest_instances WHERE habit_id = ?", String.class, UUID.fromString(h));
        // The ledger sum must match the final state exactly: completed = +30, pending = 0.
        assertThat(ledgerSum(h)).isEqualTo("COMPLETED".equals(status) ? 30 : 0);
    }

    @Test
    void aFailureInsideTheMutationRollsEverythingBack() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 25);
        UUID userId = jdbc.queryForObject("SELECT user_id FROM habits WHERE id = ?", UUID.class, UUID.fromString(h));
        jdbc.execute("CREATE OR REPLACE FUNCTION test_fail_ledger() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injected'; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER test_fail_ledger BEFORE INSERT ON xp_transactions FOR EACH ROW WHEN (NEW.user_id = '" + userId + "') EXECUTE FUNCTION test_fail_ledger()");
        try {
            HttpResponse<String> r = put(b, h, today());
            assertThat(r.statusCode()).isEqualTo(500);
            assertThat(r.body()).contains("INTERNAL_ERROR");
        } finally {
            jdbc.execute("DROP TRIGGER test_fail_ledger ON xp_transactions");
        }
        // Nothing survived: not the state change, not the materialized row, not a ledger event.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM quest_instances WHERE habit_id = ?", Integer.class, UUID.fromString(h))).isZero();
        assertThat(ledgerRows(h)).isZero();
        assertThat(num(put(b, h, today()).body(), "xpAwarded")).isEqualTo(25); // and the retry works
    }

    @Test
    void anotherUsersQuestCannotBeTouched() throws Exception {
        TestBrowser alice = user(), bob = user();
        String h = habit(alice, goal(alice, "CAREER"), 20);
        assertThat(put(bob, h, today()).statusCode()).isEqualTo(404);
        assertThat(del(bob, h, today()).statusCode()).isEqualTo(404);
        assertThat(ledgerRows(h)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM quest_instances WHERE habit_id = ?", Integer.class, UUID.fromString(h))).isZero();
        assertThat(put(bob, "not-a-uuid", today()).statusCode()).isEqualTo(404);
    }

    @Test
    void futureAndTooOldAndOutOfScheduleAndPausedDaysAreRejectedWithContractCodes() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 20);
        backdate(h, 30);

        HttpResponse<String> future = put(b, h, today().plusDays(1));
        assertThat(future.statusCode()).isEqualTo(422);
        assertThat(future.body()).contains("QUEST_IN_FUTURE");

        assertThat(put(b, h, today().minusDays(7)).statusCode()).isEqualTo(200); // 7 days back is still allowed
        HttpResponse<String> old = put(b, h, today().minusDays(8));
        assertThat(old.statusCode()).isEqualTo(422);
        assertThat(old.body()).contains("QUEST_TOO_OLD");

        String fresh = habit(b, goal(b, "CAREER"), 20); // starts today
        HttpResponse<String> before = put(b, fresh, today().minusDays(1));
        assertThat(before.statusCode()).isEqualTo(422);
        assertThat(before.body()).contains("QUEST_OUTSIDE_SCHEDULE");

        jdbc.update("INSERT INTO lifecycle_events (id, user_id, subject_type, subject_id, effective_date, status, created_at) "
            + "SELECT ?, user_id, 'HABIT', id, ?, 'PAUSED', now() FROM habits WHERE id = ?", UUID.randomUUID(), java.sql.Date.valueOf(today().minusDays(2)), UUID.fromString(h));
        HttpResponse<String> paused = put(b, h, today().minusDays(1));
        assertThat(paused.statusCode()).isEqualTo(409);
        assertThat(paused.body()).contains("QUEST_NOT_ACTIVE");
        assertThat(put(b, h, today().minusDays(3)).statusCode()).isEqualTo(200); // before the pause: history still editable
    }

    @Test
    void malformedDateIs422() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 20);
        HttpResponse<String> r = b.send("PUT", "/api/v1/quests/" + h + "/dates/2029-02-29/completion", null, true);
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("VALIDATION_FAILED", "\"date\"");
    }

    @Test
    void levelRisesAtTheExactThresholdAndFallsBackOnUndo() throws Exception {
        TestBrowser b = user();
        List<String> habits = new ArrayList<>();
        for (int i = 0; i < 4; i++) habits.add(habit(b, goal(b, "CAREER"), 100));
        String last = "";
        for (int i = 0; i < 3; i++) last = put(b, habits.get(i), today()).body();
        assertThat(last).contains("\"totalXp\":300", "\"level\":1");
        HttpResponse<String> up = put(b, habits.get(3), today());
        assertThat(up.body()).contains("\"totalXp\":400", "\"level\":2");
        assertThat(b.get("/api/v1/dashboard/today").body()).contains("\"levelStartXp\":400", "\"nextXp\":900".replace("nextXp", "nextLevelXp"));
        HttpResponse<String> down = del(b, habits.get(3), today());
        assertThat(down.body()).contains("\"totalXp\":300", "\"level\":1", "\"xpAwarded\":-100");
    }

    @Test
    void theLedgerCannotBeEditedOrDeleted() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b, "CAREER"), 20);
        put(b, h, today());
        UUID id = jdbc.queryForObject("SELECT x.id FROM xp_transactions x JOIN quest_instances q ON q.id = x.source_id WHERE q.habit_id = ?", UUID.class, UUID.fromString(h));
        try { jdbc.update("UPDATE xp_transactions SET amount = 999 WHERE id = ?", id); throw new AssertionError("update allowed"); } catch (DataAccessException expected) { /* append-only */ }
        try { jdbc.update("DELETE FROM xp_transactions WHERE id = ?", id); throw new AssertionError("delete allowed"); } catch (DataAccessException expected) { /* append-only */ }
        assertThat(ledgerSum(h)).isEqualTo(20);
    }
}
