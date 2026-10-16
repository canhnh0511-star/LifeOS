package app.lifeos.importer;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HabitPlanImportIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;

    private static final String PATH = "/api/v1/imports/habit-plans";
    private static String today() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString(); }

    private static String habit(String title, int xp, String weekdays) {
        return "{\"title\":\"" + title + "\",\"targetMinutes\":30,\"xpReward\":" + xp + ",\"weekdays\":" + weekdays + "}";
    }
    private static String goal(String title, String... habits) {
        return "{\"title\":\"" + title + "\",\"category\":\"HEALTH\",\"description\":\"d\",\"habits\":[" + String.join(",", habits) + "]}";
    }
    private static String plan(String startDate, String... goals) {
        return "{\"startDate\":\"" + startDate + "\",\"goals\":[" + String.join(",", goals) + "]}";
    }
    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }

    @Test
    void requiresASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(anon.post(PATH, plan(today(), goal("G", habit("H", 20, "[1]")))).statusCode()).isEqualTo(401);
    }

    @Test
    void createsEveryGoalHabitAndScheduleInOneCall() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post(PATH, plan(today(),
            goal("Nước", habit("Uống nước", 20, "[1,2,3,4,5,6,7]"), habit("Ăn đạm", 30, "[3,1,1]")),
            goal("Vận động", habit("Gym", 50, "[1,3,5]"))));
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.body()).contains("\"goals\":[", "\"habits\":[", "\"category\":\"HEALTH\"", "\"status\":\"ACTIVE\"");
        assertThat(b.get("/api/v1/goals").body()).contains("Nước", "Vận động");
        String habits = b.get("/api/v1/habits").body();
        assertThat(habits).contains("Uống nước", "Ăn đạm", "Gym", "\"startDate\":\"" + today() + "\"", "\"weekdays\":[1,3]", "\"weekdays\":[1,3,5]");
        assertThat(b.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(4);
    }

    @Test
    void anInvalidHabitRollsBackTheWholePlanAndNamesTheField() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post(PATH, plan(today(),
            goal("Tốt", habit("Hợp lệ", 20, "[1]")),
            goal("Xấu", habit("Hợp lệ 2", 20, "[2]"), habit("Quá XP", 101, "[3]"))));
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("\"code\":\"VALIDATION_FAILED\"", "goals[1].habits[1].xpReward");
        assertThat(b.get("/api/v1/goals").body()).isEqualTo("[]");
        assertThat(b.get("/api/v1/habits").body()).isEqualTo("[]");
    }

    @Test
    void reportsGoalLevelAndStartDateErrors() throws Exception {
        TestBrowser b = user();
        String bad = "{\"title\":\"\",\"category\":\"NOPE\",\"description\":\"d\",\"habits\":[]}";
        HttpResponse<String> r = b.post(PATH, plan(today(), bad));
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("goals[0].title", "goals[0].category", "goals[0].habits");
        // A past start date is reported once under its own key, however many habits share it.
        HttpResponse<String> past = b.post(PATH, plan("2000-01-01", goal("G", habit("A", 20, "[1]"), habit("B", 20, "[2]"))));
        assertThat(past.statusCode()).isEqualTo(422);
        assertThat(past.body()).contains("\"startDate\"").doesNotContain("habits[0].startDate");
        assertThat(b.get("/api/v1/goals").body()).isEqualTo("[]");
        assertThat(b.post(PATH, "{\"startDate\":\"" + today() + "\",\"goals\":[]}").body()).contains("goals");
        assertThat(b.post(PATH, "{}").statusCode()).isEqualTo(422);
    }

    @Test
    void enforcesSizeLimits() throws Exception {
        TestBrowser b = user();
        String tooManyGoals = IntStream.range(0, 11).mapToObj(i -> goal("G" + i, habit("H", 20, "[1]"))).collect(Collectors.joining(","));
        HttpResponse<String> goals = b.post(PATH, "{\"startDate\":\"" + today() + "\",\"goals\":[" + tooManyGoals + "]}");
        assertThat(goals.statusCode()).isEqualTo(422);
        assertThat(goals.body()).contains("\"goals\"");
        String manyHabits = IntStream.range(0, 51).mapToObj(i -> habit("H" + i, 20, "[1]")).collect(Collectors.joining(","));
        HttpResponse<String> habits = b.post(PATH, plan(today(), goal("G", manyHabits)));
        assertThat(habits.statusCode()).isEqualTo(422);
        assertThat(b.get("/api/v1/goals").body()).isEqualTo("[]");
    }

    @Test
    void importingTheSamePlanTwiceIsAConflictAndCreatesNothingNew() throws Exception {
        TestBrowser b = user();
        String body = plan(today(), goal("Lặp", habit("H", 20, "[1]")));
        assertThat(b.post(PATH, body).statusCode()).isEqualTo(201);
        HttpResponse<String> again = b.post(PATH, body);
        assertThat(again.statusCode()).isEqualTo(409);
        assertThat(again.body()).contains("\"code\":\"PLAN_ALREADY_IMPORTED\"");
        assertThat(b.get("/api/v1/goals").body().split("\"title\"", -1)).hasSize(2);
        // The same title twice inside one request is the same mistake.
        assertThat(user().post(PATH, plan(today(), goal("Đôi", habit("H", 20, "[1]")), goal("Đôi", habit("H", 20, "[1]")))).statusCode()).isEqualTo(409);
    }

    @Test
    void anotherUserMayImportTheSameTitleAndNeverSeesTheFirstUsersData() throws Exception {
        TestBrowser alice = user(), bob = user();
        String body = plan(today(), goal("Chung", habit("H", 20, "[1]")));
        assertThat(alice.post(PATH, body).statusCode()).isEqualTo(201);
        assertThat(bob.get("/api/v1/goals").body()).isEqualTo("[]");
        assertThat(bob.post(PATH, body).statusCode()).isEqualTo(201);
    }

    @Test
    void importedHabitsBecomeQuestsAndEarnXp() throws Exception {
        TestBrowser b = user();
        assertThat(b.post(PATH, plan(today(), goal("Quest", habit("Mỗi ngày", 30, "[1,2,3,4,5,6,7]")))).statusCode()).isEqualTo(201);
        String quests = b.get("/api/v1/quests?date=" + today()).body();
        assertThat(quests).contains("Mỗi ngày", "\"xpReward\":30", "\"category\":\"HEALTH\"");
        String habitId = TestBrowser.idOf(b.get("/api/v1/habits").body());
        HttpResponse<String> done = b.send("PUT", "/api/v1/quests/" + habitId + "/dates/" + today() + "/completion", null, true);
        assertThat(done.statusCode()).as(done.body()).isEqualTo(200);
        assertThat(done.body()).contains("\"xpAwarded\":30");
    }
}
