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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class QuestObjectivesIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String LEGS = "[{\"title\":\"Squat\",\"target\":40,\"unit\":\"rep\",\"step\":5},{\"title\":\"Lunge\",\"target\":30,\"unit\":\"rep\"}]";
    private static LocalDate today() { return LocalDate.now(ZONE); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private String goal(TestBrowser b) throws Exception {
        return TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"HEALTH\",\"description\":\"\"}").body());
    }
    private HttpResponse<String> createHabit(TestBrowser b, String goal, int xp, String objectivesJson) throws Exception {
        return b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"Tập chân\",\"targetMinutes\":45,\"xpReward\":" + xp
            + ",\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"" + (objectivesJson == null ? "" : ",\"objectives\":" + objectivesJson) + "}");
    }
    private String habit(TestBrowser b, int xp, String objectivesJson, int backdate) throws Exception {
        HttpResponse<String> r = createHabit(b, goal(b), xp, objectivesJson);
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        String id = TestBrowser.idOf(r.body());
        if (backdate > 0) {
            jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", backdate, UUID.fromString(id));
            jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", backdate, UUID.fromString(id));
        }
        return id;
    }
    /** ids of the quest's checklist lines, in order. */
    private List<String> lines(TestBrowser b, String habit, LocalDate d) throws Exception {
        String body = b.get("/api/v1/quests?date=" + d).body();
        int i = body.indexOf("\"habitId\":\"" + habit + "\"");
        int objectivesAt = body.indexOf("\"objectives\":[", i);
        int end = body.indexOf("]", objectivesAt);
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(body.substring(objectivesAt, end));
        List<String> ids = new ArrayList<>();
        while (m.find()) ids.add(m.group(1));
        return ids;
    }
    private HttpResponse<String> set(TestBrowser b, String habit, LocalDate d, String objective, Object value) throws Exception {
        return b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/objectives/" + objective, "{\"value\":" + value + "}", true);
    }
    private HttpResponse<String> complete(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true); }
    private HttpResponse<String> undo(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("DELETE", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true); }
    private HttpResponse<String> ok(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return r; }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private UUID userId(TestBrowser b) throws Exception { return UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body())); }
    private int ledgerRows(UUID u) { return jdbc.queryForObject("SELECT count(*) FROM xp_transactions WHERE user_id = ? AND source_type = 'QUEST'", Integer.class, u); }
    private int ledgerSum(UUID u) { return jdbc.queryForObject("SELECT coalesce(sum(amount),0) FROM xp_transactions WHERE user_id = ?", Integer.class, u); }

    @Test void aHabitCanCarryAChecklistAndEveryOtherHabitStaysAPlainTick() throws Exception {
        TestBrowser b = user();
        String withList = habit(b, 30, LEGS, 0);
        String plain = habit(b, 20, null, 0);
        String habits = b.get("/api/v1/habits").body();
        assertThat(habits).contains("\"title\":\"Squat\"", "\"target\":40", "\"unit\":\"rep\"", "\"step\":5", "\"title\":\"Lunge\"", "\"step\":1");
        String quests = b.get("/api/v1/quests?date=" + today()).body();
        assertThat(quests).contains("\"value\":0");
        assertThat(lines(b, withList, today())).hasSize(2);
        assertThat(lines(b, plain, today())).isEmpty();
    }

    @Test void theQuestCompletesOnceEveryLineIsMetAndNotBefore() throws Exception {
        TestBrowser b = user(); UUID u = userId(b);
        String h = habit(b, 30, LEGS, 0);
        List<String> l = lines(b, h, today());
        HttpResponse<String> half = ok(set(b, h, today(), l.get(0), 40));
        assertThat(half.body()).contains("\"status\":\"PENDING\"", "\"xpAwarded\":0", "\"value\":40", "\"value\":0");
        assertThat(ledgerRows(u)).isZero();
        HttpResponse<String> done = ok(set(b, h, today(), l.get(1), 30));
        assertThat(done.body()).contains("\"status\":\"COMPLETED\"");
        assertThat(num(done.body(), "xpAwarded")).isEqualTo(30);
        assertThat(num(done.body(), "totalXp")).isEqualTo(30);
        assertThat(ledgerRows(u)).isEqualTo(1);
        // the list endpoints agree
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"status\":\"COMPLETED\"");
        // sending the same value again changes nothing and awards nothing
        HttpResponse<String> again = ok(set(b, h, today(), l.get(1), 30));
        assertThat(num(again.body(), "xpAwarded")).isZero();
        assertThat(ledgerRows(u)).isEqualTo(1);
        // going beyond the target is fine
        assertThat(ok(set(b, h, today(), l.get(0), 55)).body()).contains("\"value\":55", "\"status\":\"COMPLETED\"");
    }

    @Test void droppingBelowTheTargetUndoesTheQuestAndReachingItAgainStartsANewCycle() throws Exception {
        TestBrowser b = user(); UUID u = userId(b);
        String h = habit(b, 30, LEGS, 0);
        List<String> l = lines(b, h, today());
        set(b, h, today(), l.get(0), 40); set(b, h, today(), l.get(1), 30);
        HttpResponse<String> back = ok(set(b, h, today(), l.get(1), 29));
        assertThat(back.body()).contains("\"status\":\"PENDING\"");
        assertThat(num(back.body(), "xpAwarded")).isEqualTo(-30);
        assertThat(ledgerSum(u)).isZero();
        assertThat(num(ok(set(b, h, today(), l.get(1), 30)).body(), "xpAwarded")).isEqualTo(30);
        assertThat(jdbc.queryForObject("SELECT cycle FROM quest_instances WHERE user_id = ?", Integer.class, u)).isEqualTo(2);
        assertThat(ledgerRows(u)).isEqualTo(3);
        assertThat(ledgerSum(u)).isEqualTo(30);
    }

    @Test void theQuickEndpointsStillWorkOnAQuestWithAChecklist() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 30, LEGS, 0);
        HttpResponse<String> all = ok(complete(b, h, today()));
        assertThat(num(all.body(), "xpAwarded")).isEqualTo(30);
        assertThat(all.body()).contains("\"value\":40", "\"value\":30");
        HttpResponse<String> none = ok(undo(b, h, today()));
        assertThat(num(none.body(), "xpAwarded")).isEqualTo(-30);
        assertThat(none.body()).doesNotContain("\"value\":40").contains("\"value\":0");
        assertThat(num(ok(complete(b, h, today())).body(), "xpAwarded")).isEqualTo(30);
    }

    @Test void anUndoOnAQuestThatIsNotDoneKeepsThePartialProgress() throws Exception {
        TestBrowser b = user(); UUID u = userId(b);
        String h = habit(b, 30, LEGS, 0);
        List<String> l = lines(b, h, today());
        set(b, h, today(), l.get(0), 30);
        HttpResponse<String> r = ok(undo(b, h, today()));
        assertThat(num(r.body(), "xpAwarded")).isZero();
        assertThat(r.body()).contains("\"value\":30");
        assertThat(ledgerRows(u)).isZero();
    }

    @Test void aWrongTargetIsReportedOnceWithoutBlamingAValidStep() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = createHabit(b, goal(b), 10, "[{\"title\":\"x\",\"target\":0,\"step\":5}]");
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("objectives[0].target").doesNotContain("objectives[0].step");
    }

    @Test void twoRequestsFinishingDifferentLinesAtOnceCompleteTheQuestExactlyOnce() throws Exception {
        TestBrowser b = user(); UUID u = userId(b);
        String h = habit(b, 40, LEGS, 0);
        List<String> l = lines(b, h, today());
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Callable<HttpResponse<String>>> calls = List.of(() -> set(b, h, today(), l.get(0), 40), () -> set(b, h, today(), l.get(1), 30));
            int awarded = 0;
            for (Future<HttpResponse<String>> f : pool.invokeAll(calls)) {
                HttpResponse<String> r = ok(f.get());
                if (num(r.body(), "xpAwarded") == 40) awarded++;
            }
            assertThat(awarded).isEqualTo(1);
        } finally { pool.shutdownNow(); }
        assertThat(ledgerRows(u)).isEqualTo(1);
        assertThat(ledgerSum(u)).isEqualTo(40);
    }

    @Test void editingTheChecklistOnlyAppliesFromTomorrowAndLivedDaysKeepTheirOwn() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 30, LEGS, 3);                                   // started 3 days ago, nothing opened yet
        ok(b.patch("/api/v1/habits/" + h, "{\"objectives\":[{\"title\":\"Leg press\",\"target\":12,\"unit\":\"lần\"}]}"));
        String yesterday = b.get("/api/v1/quests?date=" + today().minusDays(1)).body();
        assertThat(yesterday).contains("\"title\":\"Squat\"").doesNotContain("Leg press");   // lived days keep the old list
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"title\":\"Squat\"");   // so does today
        assertThat(b.get("/api/v1/quests?date=" + today().plusDays(1)).body()).contains("\"title\":\"Leg press\"").doesNotContain("Squat");
        assertThat(b.get("/api/v1/habits").body()).contains("\"title\":\"Leg press\"").doesNotContain("\"title\":\"Squat\"");
        // clearing it turns the habit back into a plain tick from tomorrow on
        ok(b.patch("/api/v1/habits/" + h, "{\"objectives\":[]}"));
        assertThat(lines(b, h, today().plusDays(1))).isEmpty();
        assertThat(lines(b, h, today())).hasSize(2);
    }

    @Test void invalidChecklistsAreRejectedWithFieldMessages() throws Exception {
        TestBrowser b = user();
        String g = goal(b);
        String tooMany = "[" + String.join(",", java.util.Collections.nCopies(21, "{\"title\":\"x\",\"target\":1}")) + "]";
        for (String bad : new String[] {"[{\"title\":\"\",\"target\":5}]", "[{\"title\":\"x\",\"target\":0}]", "[{\"title\":\"x\",\"target\":10001}]", "[{\"title\":\"x\",\"target\":\"5\"}]",
                "[{\"title\":\"x\",\"target\":5,\"step\":6}]", "[{\"title\":\"x\",\"target\":5,\"unit\":\"" + "u".repeat(21) + "\"}]", "[{\"target\":5}]", tooMany}) {
            HttpResponse<String> r = createHabit(b, g, 10, bad);
            assertThat(r.statusCode()).as(bad).isEqualTo(422);
            assertThat(r.body()).as(bad).contains("objectives");
        }
        assertThat(b.get("/api/v1/habits").body()).isEqualTo("[]");
    }

    @Test void progressRequestsAreValidatedAndOwnedByTheUser() throws Exception {
        TestBrowser alice = user(), bob = user();
        String h = habit(alice, 30, LEGS, 8);
        List<String> l = lines(alice, h, today());
        for (Object bad : new Object[] {-1, 100001, "\"x\"", "null", 1.5}) assertThat(set(alice, h, today(), l.get(0), bad).statusCode()).as(String.valueOf(bad)).isEqualTo(422);
        assertThat(set(alice, h, today(), UUID.randomUUID().toString(), 5).statusCode()).isEqualTo(404);
        assertThat(set(alice, h, today(), "not-a-uuid", 5).statusCode()).isEqualTo(404);
        assertThat(set(bob, h, today(), l.get(0), 5).statusCode()).isEqualTo(404);                          // another user's habit
        HttpResponse<String> future = set(alice, h, today().plusDays(1), l.get(0), 5);
        assertThat(future.statusCode()).isEqualTo(422); assertThat(future.body()).contains("QUEST_IN_FUTURE");
        HttpResponse<String> old = set(alice, h, today().minusDays(8), l.get(0), 5);
        assertThat(old.statusCode()).isEqualTo(422); assertThat(old.body()).contains("QUEST_TOO_OLD");
        String plain = habit(alice, 10, null, 0);
        assertThat(set(alice, plain, today(), l.get(0), 5).statusCode()).isEqualTo(404);                    // a line of a different habit
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");                                                                             // receives the CSRF cookie
        assertThat(set(anon, h, today(), l.get(0), 5).statusCode()).isEqualTo(401);
    }

    @Test void aFailedLedgerWriteLeavesTheProgressUnchanged() throws Exception {
        TestBrowser b = user(); UUID u = userId(b);
        String h = habit(b, 30, LEGS, 0);
        List<String> l = lines(b, h, today());
        set(b, h, today(), l.get(0), 40);
        jdbc.execute("CREATE OR REPLACE FUNCTION fail_quest_complete() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'boom'; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER fail_quest_complete BEFORE INSERT ON xp_transactions FOR EACH ROW WHEN (NEW.event_type = 'QUEST_COMPLETE') EXECUTE FUNCTION fail_quest_complete()");
        try {
            assertThat(set(b, h, today(), l.get(1), 30).statusCode()).isEqualTo(500);
        } finally {
            jdbc.execute("DROP TRIGGER fail_quest_complete ON xp_transactions");
            jdbc.execute("DROP FUNCTION fail_quest_complete()");
        }
        assertThat(jdbc.queryForObject("SELECT value FROM quest_objectives WHERE id = ?", Integer.class, UUID.fromString(l.get(1)))).isZero();
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"status\":\"PENDING\"");
        assertThat(ledgerRows(u)).isZero();
    }

    @Test void aPlanImportCarriesTheChecklists() throws Exception {
        TestBrowser b = user();
        String plan = "{\"startDate\":\"" + today() + "\",\"goals\":[{\"title\":\"Giảm cân\",\"category\":\"HEALTH\",\"description\":\"\",\"habits\":["
            + "{\"title\":\"Uống đủ nước\",\"targetMinutes\":5,\"xpReward\":20,\"weekdays\":[1,2,3,4,5,6,7],\"objectives\":[{\"title\":\"Cốc 250ml\",\"target\":10,\"unit\":\"cốc\"}]}]}]}";
        HttpResponse<String> r = b.post("/api/v1/imports/habit-plans", plan);
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.body()).contains("\"title\":\"Cốc 250ml\"", "\"target\":10");
        String bad = plan.replace("\"Giảm cân\"", "\"Kế hoạch khác\"").replace("\"target\":10", "\"target\":0");
        HttpResponse<String> rejected = b.post("/api/v1/imports/habit-plans", bad);
        assertThat(rejected.statusCode()).isEqualTo(422);
        assertThat(b.get("/api/v1/goals").body()).doesNotContain("Kế hoạch khác");
    }
}
