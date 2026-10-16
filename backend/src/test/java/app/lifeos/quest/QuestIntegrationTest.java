package app.lifeos.quest;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class QuestIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private String createGoal(TestBrowser b, String category) throws Exception {
        HttpResponse<String> r = b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"" + category + "\",\"description\":\"\"}");
        assertThat(r.statusCode()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private String createHabit(TestBrowser b, String goalId, int xp, String weekdays) throws Exception {
        HttpResponse<String> r = b.post("/api/v1/habits", "{\"goalId\":\"" + goalId + "\",\"title\":\"Piano\",\"targetMinutes\":30,\"xpReward\":" + xp
            + ",\"weekdays\":" + weekdays + ",\"startDate\":\"" + today() + "\"}");
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private static String everyDay() { return "[1,2,3,4,5,6,7]"; }
    private int count(String sql, Object... args) { return jdbc.queryForObject(sql, Integer.class, args); }

    @Test
    void questEndpointsRequireASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(anon.get("/api/v1/quests?date=" + today()).statusCode()).isEqualTo(401);
        assertThat(anon.get("/api/v1/dashboard/today").statusCode()).isEqualTo(401);
    }

    @Test
    void todaysQuestMatchesTheContractAndIsMaterializedOnce() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "HEALTH");
        String habit = createHabit(b, goal, 35, everyDay());

        HttpResponse<String> first = b.get("/api/v1/quests?date=" + today());
        assertThat(first.statusCode()).isEqualTo(200);
        assertThat(first.body()).contains("\"habitId\":\"" + habit + "\"", "\"goalId\":\"" + goal + "\"", "\"goalTitle\":\"G\"", "\"title\":\"Piano\"",
            "\"targetMinutes\":30", "\"xpReward\":35", "\"category\":\"HEALTH\"", "\"date\":\"" + today() + "\"", "\"status\":\"PENDING\"", "\"completedAt\":null");
        // Repeated reads (and a dashboard read) reuse the same row: unique (user, habit, date).
        b.get("/api/v1/quests?date=" + today());
        b.get("/api/v1/dashboard/today");
        assertThat(count("SELECT count(*) FROM quest_instances WHERE habit_id = ?", UUID.fromString(habit))).isEqualTo(1);
    }

    @Test
    void readingNeverAwardsXp() throws Exception {
        TestBrowser b = user();
        createHabit(b, createGoal(b, "CAREER"), 50, everyDay());
        String body = b.get("/api/v1/dashboard/today").body();
        assertThat(body).contains("\"earnedXpToday\":0", "\"totalXp\":0", "\"completedCount\":0", "\"scheduledCount\":1", "\"level\":1");
    }

    @Test
    void dashboardCarriesTheSignedInUserAndAllFiveAreas() throws Exception {
        TestBrowser b = user();
        String body = b.get("/api/v1/dashboard/today").body();
        assertThat(body).contains("\"date\":\"" + today() + "\"", "\"timezone\":\"Asia/Ho_Chi_Minh\"", "\"quests\":[]");
        for (String c : List.of("CAREER", "CREATIVITY", "HEALTH", "KNOWLEDGE", "MINDFULNESS")) assertThat(body).contains("\"category\":\"" + c + "\"");
    }

    @Test
    void weeklyRestDayHasNoQuest() throws Exception {
        TestBrowser b = user();
        int notToday = today().getDayOfWeek().getValue() % 7 + 1; // any weekday except today's
        createHabit(b, createGoal(b, "CAREER"), 20, "[" + notToday + "]");
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).isEqualTo("[]");
        LocalDate next = today().plusDays(1);
        while (next.getDayOfWeek().getValue() != notToday) next = next.plusDays(1);
        assertThat(b.get("/api/v1/quests?date=" + next).body()).contains("\"date\":\"" + next + "\"");
    }

    @Test
    void futureDaysArePreviewedButNeverStored() throws Exception {
        TestBrowser b = user();
        String habit = createHabit(b, createGoal(b, "CAREER"), 20, everyDay());
        LocalDate far = today().plusDays(400);
        assertThat(b.get("/api/v1/quests?date=" + far).body()).contains("\"habitId\":\"" + habit + "\"");
        assertThat(count("SELECT count(*) FROM quest_instances WHERE habit_id = ?", UUID.fromString(habit))).isZero();
    }

    @Test
    void daysBeforeTheHabitStartedHaveNoQuests() throws Exception {
        TestBrowser b = user();
        createHabit(b, createGoal(b, "CAREER"), 20, everyDay());
        assertThat(b.get("/api/v1/quests?date=" + today().minusDays(1)).body()).isEqualTo("[]");
    }

    @Test
    void pausingStartsTomorrowAndKeepsTodayAndThePast() throws Exception {
        TestBrowser b = user();
        String habit = createHabit(b, createGoal(b, "CAREER"), 20, everyDay());
        b.get("/api/v1/quests?date=" + today()); // today is lived and materialized
        assertThat(b.patch("/api/v1/habits/" + habit, "{\"status\":\"PAUSED\"}").statusCode()).isEqualTo(200);
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains(habit);
        assertThat(b.get("/api/v1/quests?date=" + today().plusDays(1)).body()).isEqualTo("[]");
        b.patch("/api/v1/habits/" + habit, "{\"status\":\"ACTIVE\"}");
        assertThat(b.get("/api/v1/quests?date=" + today().plusDays(1)).body()).contains(habit);
    }

    @Test
    void pausingTheGoalSuppressesItsHabitsFromTomorrow() throws Exception {
        TestBrowser b = user();
        String goal = createGoal(b, "CAREER");
        String habit = createHabit(b, goal, 20, everyDay());
        assertThat(b.patch("/api/v1/goals/" + goal, "{\"status\":\"PAUSED\"}").statusCode()).isEqualTo(200);
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains(habit);
        assertThat(b.get("/api/v1/quests?date=" + today().plusDays(1)).body()).isEqualTo("[]");
    }

    @Test
    void theRewardIsSnapshottedAtMaterialization() throws Exception {
        TestBrowser b = user();
        String habit = createHabit(b, createGoal(b, "CAREER"), 35, everyDay());
        b.get("/api/v1/quests?date=" + today());
        // Simulate a later edit of the definition; the lived day keeps the original reward.
        jdbc.update("UPDATE habits SET xp_reward = 100 WHERE id = ?", UUID.fromString(habit));
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"xpReward\":35");
        // An unmaterialized future preview follows the current definition.
        assertThat(b.get("/api/v1/quests?date=" + today().plusDays(2)).body()).contains("\"xpReward\":100");
    }

    @Test
    void userLocalDateDecidesToday_notTheServerOrUtcDate() throws Exception {
        TestBrowser east = user(), west = user();
        jdbc.update("UPDATE users SET timezone = 'Pacific/Kiritimati' WHERE email = (SELECT email FROM users ORDER BY created_at DESC OFFSET 1 LIMIT 1)");
        jdbc.update("UPDATE users SET timezone = 'Pacific/Pago_Pago' WHERE email = (SELECT email FROM users ORDER BY created_at DESC LIMIT 1)");
        LocalDate eastToday = LocalDate.now(ZoneId.of("Pacific/Kiritimati")), westToday = LocalDate.now(ZoneId.of("Pacific/Pago_Pago"));
        assertThat(eastToday).isNotEqualTo(westToday); // UTC+14 and UTC-11 never share a date
        assertThat(east.get("/api/v1/dashboard/today").body()).contains("\"date\":\"" + eastToday + "\"");
        assertThat(west.get("/api/v1/dashboard/today").body()).contains("\"date\":\"" + westToday + "\"");
    }

    @Test
    void anotherUsersHabitsNeverAppear() throws Exception {
        TestBrowser alice = user(), bob = user();
        String habit = createHabit(alice, createGoal(alice, "CAREER"), 20, everyDay());
        assertThat(bob.get("/api/v1/quests?date=" + today()).body()).isEqualTo("[]");
        assertThat(bob.get("/api/v1/dashboard/today").body()).doesNotContain(habit).contains("\"scheduledCount\":0");
    }

    @Test
    void badOrMissingDatesAre422_andLeapDayParses() throws Exception {
        TestBrowser b = user();
        for (String bad : List.of("", "?date=", "?date=2029-02-29", "?date=2028-13-01", "?date=tomorrow", "?date=2028-2-29")) {
            HttpResponse<String> r = b.get("/api/v1/quests" + bad);
            assertThat(r.statusCode()).as(bad).isEqualTo(422);
            assertThat(r.body()).contains("VALIDATION_FAILED", "\"date\"");
        }
        assertThat(b.get("/api/v1/dashboard/today?date=2029-02-29").statusCode()).isEqualTo(422);
        assertThat(b.get("/api/v1/quests?date=2028-02-29").statusCode()).isEqualTo(200);
    }
}
