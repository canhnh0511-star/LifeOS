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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** B-34 / ADR-037: the workout set log is a plain record. It must never move XP, the ledger or a quest's state. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WorkoutSetIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }
    private static String everyDay() { return "[1,2,3,4,5,6,7]"; }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private UUID userId(TestBrowser b) throws Exception { return UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body())); }
    private String goal(TestBrowser b) throws Exception {
        return TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"Gym\",\"category\":\"HEALTH\",\"description\":\"\"}").body());
    }
    private String habit(TestBrowser b, String weekdays, LocalDate start) throws Exception {
        // The API only starts habits from today, so a habit that "started earlier" is moved back in the database, like the other quest tests do.
        HttpResponse<String> r = b.post("/api/v1/habits", "{\"goalId\":\"" + goal(b) + "\",\"title\":\"Buổi A\",\"targetMinutes\":45,\"xpReward\":40,\"weekdays\":" + weekdays + ",\"startDate\":\"" + today() + "\"}");
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        String id = TestBrowser.idOf(r.body());
        long back = java.time.temporal.ChronoUnit.DAYS.between(start, today());
        jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", (int) back, UUID.fromString(id));
        jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", (int) back, UUID.fromString(id));
        return id;
    }
    private String url(String habit, LocalDate d) { return "/api/v1/quests/" + habit + "/dates/" + d + "/sets"; }
    private HttpResponse<String> put(TestBrowser b, String habit, LocalDate d, String exercise, Object setNo, Object reps, Object weight) throws Exception {
        return b.send("PUT", url(habit, d), "{\"exercise\":\"" + exercise + "\",\"setNo\":" + setNo + ",\"reps\":" + reps + ",\"weightKg\":" + weight + "}", true);
    }
    private int sets(UUID user) { return jdbc.queryForObject("SELECT count(*) FROM workout_sets WHERE user_id = ?", Integer.class, user); }

    @Test void endpointsRequireASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(anon.get(url(UUID.randomUUID().toString(), today())).statusCode()).isEqualTo(401);
        assertThat(anon.get("/api/v1/workout-sets/last?exercise=x&before=" + today()).statusCode()).isEqualTo(401);
    }

    @Test void recordingIsIdempotentBySetAndIgnoresCaseOfTheExerciseName() throws Exception {
        TestBrowser b = user();
        String h = habit(b, everyDay(), today());
        assertThat(put(b, h, today(), "Machine Chest Press", 1, 10, 40.5).statusCode()).isEqualTo(200);
        HttpResponse<String> again = put(b, h, today(), "machine chest press", 1, 12, 42);
        assertThat(again.body()).contains("\"reps\":12", "\"weightKg\":42.0").doesNotContain("\"reps\":10");
        assertThat(sets(userId(b))).isEqualTo(1);
        put(b, h, today(), "Machine Chest Press", 2, 9, "null");
        put(b, h, today(), "Dead Bug", 1, 8, "null");
        String list = b.get(url(h, today())).body();
        assertThat(list.indexOf("Dead Bug")).isLessThan(list.indexOf("Machine Chest Press")); // by exercise, then set
        assertThat(list).contains("\"weightKg\":null");
        assertThat(sets(userId(b))).isEqualTo(3);
    }

    @Test void loggingSetsNeverTouchesXpTheLedgerOrTheQuest() throws Exception {
        TestBrowser b = user();
        String h = habit(b, everyDay(), today());
        UUID u = userId(b);
        int ledger = jdbc.queryForObject("SELECT count(*) FROM xp_transactions WHERE user_id = ?", Integer.class, u);
        for (int i = 1; i <= 5; i++) assertThat(put(b, h, today(), "Leg Press", i, 10, 100).statusCode()).isEqualTo(200);
        b.send("DELETE", url(h, today()) + "?exercise=Leg%20Press&setNo=5", null, true);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM xp_transactions WHERE user_id = ?", Integer.class, u)).isEqualTo(ledger);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM quest_instances WHERE user_id = ? AND status = 'COMPLETED'", Integer.class, u)).isZero();
        assertThat(b.get("/api/v1/dashboard/today").body()).contains("\"earnedXpToday\":0");
    }

    @Test void deletingASetRemovesItAndDeletingAMissingOneIsHarmless() throws Exception {
        TestBrowser b = user();
        String h = habit(b, everyDay(), today());
        put(b, h, today(), "Plank", 1, 20, "null");
        HttpResponse<String> gone = b.send("DELETE", url(h, today()) + "?exercise=plank&setNo=1", null, true);
        assertThat(gone.statusCode()).isEqualTo(200);
        assertThat(gone.body()).isEqualTo("[]");
        assertThat(b.send("DELETE", url(h, today()) + "?exercise=plank&setNo=1", null, true).statusCode()).isEqualTo(200);
    }

    @Test void invalidValuesAreFieldErrorsAndStoreNothing() throws Exception {
        TestBrowser b = user();
        String h = habit(b, everyDay(), today());
        String[][] bad = {
            {"reps", "0"}, {"reps", "1001"}, {"reps", "\"x\""}, {"reps", "1.5"}, {"reps", "null"}, {"reps", "true"},
            {"setNo", "0"}, {"setNo", "51"}, {"setNo", "\"1\""}, {"weightKg", "-1"}, {"weightKg", "1001"}, {"weightKg", "\"heavy\""}, {"weightKg", "true"}};
        for (String[] c : bad) {
            String body = "{\"exercise\":\"Squat\",\"setNo\":" + (c[0].equals("setNo") ? c[1] : "1") + ",\"reps\":" + (c[0].equals("reps") ? c[1] : "10") + ",\"weightKg\":" + (c[0].equals("weightKg") ? c[1] : "null") + "}";
            HttpResponse<String> r = b.send("PUT", url(h, today()), body, true);
            assertThat(r.statusCode()).as(c[0] + "=" + c[1]).isEqualTo(422);
            assertThat(r.body()).contains(c[0]);
        }
        for (String name : new String[] {"", "   ", "x".repeat(101)}) assertThat(put(b, h, today(), name, 1, 10, "null").statusCode()).as("[" + name + "]").isEqualTo(422);
        assertThat(sets(userId(b))).isZero();
    }

    @Test void onlyScheduledDaysInTheLastSevenDaysCanBeWritten() throws Exception {
        TestBrowser b = user();
        String h = habit(b, everyDay(), today().minusDays(10));
        assertThat(put(b, h, today().plusDays(1), "Squat", 1, 5, "null").body()).contains("QUEST_IN_FUTURE");
        assertThat(put(b, h, today().minusDays(8), "Squat", 1, 5, "null").body()).contains("QUEST_TOO_OLD");
        assertThat(put(b, h, today().minusDays(7), "Squat", 1, 5, "null").statusCode()).isEqualTo(200);
        int otherDay = today().plusDays(3).getDayOfWeek().getValue(); // a weekday that is not today's
        String weekly = habit(b, "[" + otherDay + "]", today().minusDays(10));
        LocalDate offDay = today().getDayOfWeek().getValue() == otherDay ? today().minusDays(1) : today();
        assertThat(put(b, weekly, offDay, "Squat", 1, 5, "null").body()).contains("QUEST_OUTSIDE_SCHEDULE");
        assertThat(b.get(url(h, today().plusDays(1))).statusCode()).isEqualTo(200); // reading stays open
        assertThat(b.get(url(h, today().minusDays(30))).body()).isEqualTo("[]");
        assertThat(b.get(url(h, today().minusDays(30))).statusCode()).isEqualTo(200);
        assertThat(b.get("/api/v1/quests/" + h + "/dates/nope/sets").statusCode()).isEqualTo(422);
    }

    @Test void oneUserCannotReadOrWriteAnothersSets() throws Exception {
        TestBrowser owner = user(), other = user();
        String h = habit(owner, everyDay(), today().minusDays(3));
        put(owner, h, today().minusDays(1), "Deadlift", 1, 5, 100);
        assertThat(other.get(url(h, today().minusDays(1))).statusCode()).isEqualTo(404);
        assertThat(put(other, h, today().minusDays(1), "Deadlift", 1, 5, "null").statusCode()).isEqualTo(404);
        assertThat(other.send("DELETE", url(h, today().minusDays(1)) + "?exercise=Deadlift&setNo=1", null, true).statusCode()).isEqualTo(404);
        assertThat(other.get("/api/v1/workout-sets/last?exercise=Deadlift&before=" + today()).body()).contains("\"date\":null");
        assertThat(sets(userId(owner))).isEqualTo(1);
    }

    @Test void lastTimeIsTheLatestEarlierDayAcrossHabits() throws Exception {
        TestBrowser b = user();
        String a = habit(b, everyDay(), today().minusDays(6)), c = habit(b, everyDay(), today().minusDays(6));
        put(b, a, today().minusDays(4), "Seated Cable Row", 1, 10, 30);
        put(b, c, today().minusDays(2), "Seated Cable Row", 1, 12, 35);
        put(b, c, today().minusDays(2), "Seated Cable Row", 2, 11, 35);
        put(b, c, today().minusDays(2), "Leg Press", 1, 10, 90);
        String last = b.get("/api/v1/workout-sets/last?exercise=seated%20cable%20row&before=" + today()).body();
        assertThat(last).contains("\"date\":\"" + today().minusDays(2) + "\"", "\"reps\":12", "\"reps\":11").doesNotContain("Leg Press").doesNotContain("\"reps\":10");
        assertThat(b.get("/api/v1/workout-sets/last?exercise=Seated%20Cable%20Row&before=" + today().minusDays(2)).body()).contains("\"date\":\"" + today().minusDays(4) + "\"", "\"reps\":10");
        assertThat(b.get("/api/v1/workout-sets/last?exercise=Seated%20Cable%20Row&before=" + today().minusDays(4)).body()).contains("\"date\":null", "\"sets\":[]");
        assertThat(b.get("/api/v1/workout-sets/last?exercise=&before=" + today()).statusCode()).isEqualTo(422);
        assertThat(b.get("/api/v1/workout-sets/last?exercise=x&before=nope").statusCode()).isEqualTo(422);
    }

    @Test void parallelWritesOfTheSameSetLeaveOneRow() throws Exception {
        TestBrowser b = user();
        String h = habit(b, everyDay(), today());
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Future<Integer>> results = new ArrayList<>();
            for (int i = 0; i < 8; i++) { final int reps = 8 + i; results.add(pool.submit(() -> put(b, h, today(), "Squat", 1, reps, "null").statusCode())); }
            for (Future<Integer> f : results) assertThat(f.get()).isEqualTo(200);
        } finally { pool.shutdown(); }
        assertThat(sets(userId(b))).isEqualTo(1);
    }
}
