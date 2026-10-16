package app.lifeos.goal;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GoalHabitIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }

    private static String goalJson(String title) { return "{\"title\":\"" + title + "\",\"category\":\"CAREER\",\"description\":\"d\"}"; }
    private static String habitJson(String goalId, String start) {
        return "{\"goalId\":\"" + goalId + "\",\"title\":\"Piano\",\"targetMinutes\":30,\"xpReward\":35,\"weekdays\":[5,1,3,1],\"startDate\":\"" + start + "\"}";
    }
    private String createGoal(TestBrowser b, String title) throws Exception {
        HttpResponse<String> r = b.post("/api/v1/goals", goalJson(title));
        assertThat(r.statusCode()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private String createHabit(TestBrowser b, String goalId) throws Exception {
        HttpResponse<String> r = b.post("/api/v1/habits", habitJson(goalId, today().toString()));
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }

    @Test
    void everyEndpointRequiresASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        for (String path : List.of("/api/v1/goals", "/api/v1/habits")) {
            assertThat(anon.get(path).statusCode()).as("GET " + path).isEqualTo(401);
            assertThat(anon.post(path, "{}").statusCode()).as("POST " + path).isEqualTo(401);
            assertThat(anon.patch(path + "/" + java.util.UUID.randomUUID(), "{\"status\":\"PAUSED\"}").statusCode()).as("PATCH " + path).isEqualTo(401);
        }
    }

    @Test
    void createdGoalMatchesTheContractShapeAndSurvivesANewSession() throws Exception {
        TestBrowser a = new TestBrowser(port);
        String email = a.signUp();
        HttpResponse<String> r = a.post("/api/v1/goals", "{\"title\":\"  Become better  \",\"category\":\"HEALTH\",\"description\":\" run \"}");
        assertThat(r.statusCode()).isEqualTo(201);
        assertThat(r.body()).contains("\"title\":\"Become better\"", "\"category\":\"HEALTH\"", "\"description\":\"run\"", "\"status\":\"ACTIVE\"")
            .containsPattern("\"createdAt\":\"\\d{4}-\\d\\d-\\d\\dT[\\d:.]+Z\"");
        // "Refresh": a brand-new browser logs in and still sees it.
        TestBrowser again = new TestBrowser(port);
        again.get("/api/v1/me");
        assertThat(again.post("/api/v1/auth/login", "{\"email\":\"" + email + "\",\"password\":\"correct horse battery\"}").statusCode()).isEqualTo(200);
        assertThat(again.get("/api/v1/goals").body()).contains("Become better");
    }

    @Test
    void usersOnlySeeAndTouchTheirOwnGoalsAndHabits() throws Exception {
        TestBrowser alice = user(), bob = user();
        String goal = createGoal(alice, "Alice goal");
        String habit = createHabit(alice, goal);

        assertThat(bob.get("/api/v1/goals").body()).isEqualTo("[]");
        assertThat(bob.get("/api/v1/habits").body()).isEqualTo("[]");
        // Someone else's id looks exactly like a missing one.
        HttpResponse<String> g = bob.patch("/api/v1/goals/" + goal, "{\"status\":\"PAUSED\"}");
        assertThat(g.statusCode()).isEqualTo(404);
        assertThat(g.body()).contains("\"code\":\"NOT_FOUND\"");
        assertThat(bob.patch("/api/v1/habits/" + habit, "{\"status\":\"PAUSED\"}").statusCode()).isEqualTo(404);
        assertThat(bob.patch("/api/v1/goals/not-a-uuid", "{\"status\":\"PAUSED\"}").statusCode()).isEqualTo(404);
        // Cannot hang a habit on another user's goal.
        HttpResponse<String> h = bob.post("/api/v1/habits", habitJson(goal, today().toString()));
        assertThat(h.statusCode()).isEqualTo(422);
        assertThat(h.body()).contains("\"goalId\":");
        // And nothing of Alice's changed.
        assertThat(alice.get("/api/v1/goals").body()).contains("\"status\":\"ACTIVE\"");
        assertThat(jdbc.queryForObject("select count(*) from lifecycle_events where subject_id = ?::uuid", Integer.class, goal)).isZero();
    }

    @Test
    void goalValidationReportsEachField() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post("/api/v1/goals", "{\"title\":\"  \",\"category\":\"NOPE\",\"description\":\"" + "x".repeat(601) + "\"}");
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("\"code\":\"VALIDATION_FAILED\"", "\"title\":", "\"category\":", "\"description\":");
        assertThat(b.post("/api/v1/goals", goalJson("x".repeat(151))).body()).contains("\"title\":");
    }

    @Test
    void habitCreationValidatesAndStoresASortedDedupedScheduleVersionFromItsStartDate() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "G");
        HttpResponse<String> r = b.post("/api/v1/habits", habitJson(goal, today().plusDays(2).toString()));
        assertThat(r.statusCode()).isEqualTo(201);
        assertThat(r.body()).contains("\"weekdays\":[1,3,5]", "\"startDate\":\"" + today().plusDays(2) + "\"", "\"endDate\":null", "\"status\":\"ACTIVE\"", "\"xpReward\":35");
        String habit = TestBrowser.idOf(r.body());
        Map<String, Object> v = jdbc.queryForMap("select effective_from, weekday_mask from habit_schedule_versions where habit_id = ?::uuid", habit);
        assertThat(v.get("effective_from").toString()).isEqualTo(today().plusDays(2).toString());
        assertThat(((Number) v.get("weekday_mask")).intValue()).isEqualTo(0b0010101);
        assertThat(b.get("/api/v1/habits").body()).contains("\"weekdays\":[1,3,5]");
    }

    @Test
    void habitValidationRules() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "G");
        String bad = "{\"goalId\":\"" + goal + "\",\"title\":\"\",\"targetMinutes\":0,\"xpReward\":101,\"weekdays\":[8],\"startDate\":\"" + today().minusDays(1) + "\"}";
        HttpResponse<String> r = b.post("/api/v1/habits", bad);
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("\"title\":", "\"targetMinutes\":", "\"xpReward\":", "\"weekdays\":", "\"startDate\":");
        assertThat(b.post("/api/v1/habits", habitJson(goal, "2026-13-45")).body()).contains("\"startDate\":");
        assertThat(b.post("/api/v1/habits", habitJson("nope", today().toString())).body()).contains("\"goalId\":");
        assertThat(b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"x\",\"targetMinutes\":10,\"xpReward\":0,\"weekdays\":[],\"startDate\":\"" + today() + "\"}").body()).contains("\"weekdays\":");
        // xpReward 0 is allowed.
        assertThat(b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"x\",\"targetMinutes\":10,\"xpReward\":0,\"weekdays\":[1],\"startDate\":\"" + today() + "\"}").statusCode()).isEqualTo(201);
    }

    @Test
    void pausingAGoalTakesEffectTomorrowAndIsRecordedAsALifecycleEvent() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "G");
        HttpResponse<String> r = b.patch("/api/v1/goals/" + goal, "{\"status\":\"PAUSED\"}");
        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.body()).contains("\"status\":\"PAUSED\"");
        Map<String, Object> e = jdbc.queryForMap("select effective_date, status, subject_type from lifecycle_events where subject_id = ?::uuid", goal);
        assertThat(e.get("effective_date").toString()).isEqualTo(today().plusDays(1).toString());
        assertThat(e).containsEntry("status", "PAUSED").containsEntry("subject_type", "GOAL");
        // Same status again is a no-op, resuming adds a second event; history is append-only.
        b.patch("/api/v1/goals/" + goal, "{\"status\":\"PAUSED\"}");
        assertThat(jdbc.queryForObject("select count(*) from lifecycle_events where subject_id = ?::uuid", Integer.class, goal)).isEqualTo(1);
        b.patch("/api/v1/goals/" + goal, "{\"status\":\"ACTIVE\"}");
        assertThat(jdbc.queryForObject("select count(*) from lifecycle_events where subject_id = ?::uuid", Integer.class, goal)).isEqualTo(2);
    }

    @Test
    void goalTitleAndDescriptionCanBeEditedWithoutTouchingLifecycle() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "Old");
        HttpResponse<String> r = b.patch("/api/v1/goals/" + goal, "{\"title\":\" New \",\"description\":\"\"}");
        assertThat(r.body()).contains("\"title\":\"New\"", "\"description\":\"\"");
        assertThat(jdbc.queryForObject("select count(*) from lifecycle_events where subject_id = ?::uuid", Integer.class, goal)).isZero();
    }

    @Test
    void pausingAHabitIsRecordedAndANewHabitCannotUseAPausedGoal() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "G");
        String habit = createHabit(b, goal);
        assertThat(b.patch("/api/v1/habits/" + habit, "{\"status\":\"PAUSED\"}").body()).contains("\"status\":\"PAUSED\"", "\"weekdays\":[1,3,5]");
        assertThat(jdbc.queryForObject("select count(*) from lifecycle_events where subject_id = ?::uuid and subject_type='HABIT'", Integer.class, habit)).isEqualTo(1);
        b.patch("/api/v1/goals/" + goal, "{\"status\":\"PAUSED\"}");
        assertThat(b.post("/api/v1/habits", habitJson(goal, today().toString())).body()).contains("\"goalId\":");
    }

    @Test
    void patchBodiesMustBeNonEmptyKnownAndValid() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "G");
        String habit = createHabit(b, goal);
        assertThat(b.patch("/api/v1/goals/" + goal, "{}").body()).contains("\"patch\":");
        assertThat(b.patch("/api/v1/goals/" + goal, "{\"category\":\"HEALTH\"}").statusCode()).isEqualTo(422);
        assertThat(b.patch("/api/v1/goals/" + goal, "{\"status\":\"DONE\"}").body()).contains("\"status\":");
        assertThat(b.patch("/api/v1/habits/" + habit, "{\"title\":\"x\"}").body()).contains("\"patch\":");
        assertThat(b.patch("/api/v1/habits/" + habit, "{\"status\":\"nope\"}").statusCode()).isEqualTo(422);
    }

    @Test
    void listsAreOrderedByCreationAndHabitsReferenceTheirGoal() throws Exception {
        TestBrowser b = user();
        String g1 = createGoal(b, "First"), g2 = createGoal(b, "Second");
        String body = b.get("/api/v1/goals").body();
        assertThat(body.indexOf("First")).isLessThan(body.indexOf("Second"));
        String h = createHabit(b, g2);
        assertThat(b.get("/api/v1/habits").body()).contains("\"id\":\"" + h + "\"", "\"goalId\":\"" + g2 + "\"").doesNotContain(g1);
    }
}
