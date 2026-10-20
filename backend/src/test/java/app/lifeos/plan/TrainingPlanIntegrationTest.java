package app.lifeos.plan;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TrainingPlanIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;

    private static final String PATH = "/api/v1/plan";
    private static String today() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString(); }
    private static String start() { return "{\"startDate\":\"" + today() + "\"}"; }
    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private static String goalId(String json) {
        Matcher m = Pattern.compile("\"goalId\":\"([^\"]+)\"").matcher(json);
        assertThat(m.find()).as(json).isTrue();
        return m.group(1);
    }

    @Test
    void requiresASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(anon.get(PATH).statusCode()).isEqualTo(401);
        assertThat(anon.post(PATH, start()).statusCode()).isEqualTo(401);
    }

    @Test
    void anAccountWithoutAPlanSeesTheStandardPlanAndNothingIsCreated() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.get(PATH);
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        assertThat(r.body()).contains("\"started\":false", "\"goalId\":null", "\"habitId\":null", "Buổi A", "Buổi B", "Buổi C", "Leg Press", "Bird Dog", "\"weekdays\":[1]", "\"weekdays\":[3]", "\"weekdays\":[5]", "Đi bộ nhanh", "Giãn cơ phục hồi", "\"weekdays\":[2,6]", "\"weekdays\":[4]");
        assertThat(b.get("/api/v1/goals").body()).isEqualTo("[]");
        assertThat(b.get("/api/v1/habits").body()).isEqualTo("[]");
    }

    @Test
    void startingCreatesTheAccountsOwnGoalThreeGymSessionsAndTheRecoveryDays() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post(PATH, start());
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.body()).contains("\"started\":true", "Buổi A", "Buổi B", "Buổi C", "Đi bộ nhanh", "Giãn cơ phục hồi", "\"target\":36", "\"unit\":\"giây\"", "\"unit\":\"phút\"", "\"step\":30");
        assertThat(r.body()).doesNotContain("\"habitId\":null");
        assertThat(b.get("/api/v1/goals").body()).contains("Tăng cơ · giảm mỡ toàn thân");
        assertThat(b.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(6);
        assertThat(b.get(PATH).body()).contains("\"started\":true").doesNotContain("\"habitId\":null");
    }

    @Test
    void startingTwiceKeepsTheSamePlan() throws Exception {
        TestBrowser b = user();
        String first = b.post(PATH, start()).body();
        HttpResponse<String> again = b.post(PATH, start());
        assertThat(again.statusCode()).isEqualTo(200);
        assertThat(goalId(again.body())).isEqualTo(goalId(first));
        assertThat(b.get("/api/v1/goals").body().split("\"title\"", -1)).hasSize(2);
        assertThat(b.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(6);
    }

    @Test
    void everyAccountHasItsOwnPlan() throws Exception {
        TestBrowser a = user(), c = user();
        String planA = a.post(PATH, start()).body();
        assertThat(c.get(PATH).body()).contains("\"started\":false");
        String planC = c.post(PATH, start()).body();
        assertThat(goalId(planC)).isNotEqualTo(goalId(planA));
        assertThat(a.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(6);
    }

    @Test
    void aBadStartDateIsRefusedAndCreatesNothing() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post(PATH, "{\"startDate\":\"not-a-date\"}");
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("\"code\":\"VALIDATION_FAILED\"");
        assertThat(b.get("/api/v1/goals").body()).isEqualTo("[]");
    }

    // ---- versions of the plan by body goal (ADR-044) ----
    private static String bodyGoal(String height, String start, String target) {
        return "{\"heightCm\":" + height + ",\"startWeightKg\":" + start + ",\"targetWeightKg\":" + target + ",\"startDate\":\"" + today() + "\",\"days\":100}";
    }
    private void setGoal(TestBrowser b, String height, String start, String target) throws Exception {
        assertThat(b.send("PUT", "/api/v1/body-goal", bodyGoal(height, start, target), true).statusCode()).isEqualTo(200);
    }

    @Test
    void withoutABodyGoalThePlanIsTheGentleVersion() throws Exception {
        String body = user().get(PATH).body();
        assertThat(body).contains("\"variant\":\"GENTLE\"", "\"suggestedVariant\":\"GENTLE\"").doesNotContain("Push-up");
    }

    @Test
    void losingWeightWithABmiOfThirtyOrMoreIsGentle_BelowThirtyIsStandard_GainingIsBuild() throws Exception {
        TestBrowser heavy = user(); setGoal(heavy, "166", "86", "78.5");            // BMI 31.2
        assertThat(heavy.get(PATH).body()).contains("\"suggestedVariant\":\"GENTLE\"").doesNotContain("Push-up");
        TestBrowser lighter = user(); setGoal(lighter, "175", "85", "78");           // BMI 27.8
        assertThat(lighter.get(PATH).body()).contains("\"variant\":\"STANDARD\"", "Push-up", "\"step\":40");
        TestBrowser gain = user(); setGoal(gain, "175", "60", "66");
        String build = gain.get(PATH).body();
        assertThat(build).contains("\"variant\":\"BUILD\"", "\"target\":40", "tăng cân và tăng cơ");   // Leg Press 4 x 10
    }

    @Test
    void startingCreatesTheVersionTheGoalCallsFor() throws Exception {
        TestBrowser b = user(); setGoal(b, "175", "60", "66");
        HttpResponse<String> r = b.post(PATH, start());
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.body()).contains("\"started\":true", "\"variant\":\"BUILD\"", "\"suggestedVariant\":\"BUILD\"");
        assertThat(b.get("/api/v1/goals").body()).contains("tăng cân và tăng cơ");
    }

    @Test
    void changingTheGoalAfterStartingShowsASuggestionButNeverChangesThePlan() throws Exception {
        TestBrowser b = user(); setGoal(b, "166", "86", "78.5");
        b.post(PATH, start());
        setGoal(b, "175", "60", "66");
        String body = b.get(PATH).body();
        assertThat(body).contains("\"variant\":\"GENTLE\"", "\"suggestedVariant\":\"BUILD\"", "\"started\":true");
        assertThat(b.post(PATH, start()).statusCode()).isEqualTo(200);   // starting again is still a no-op
        assertThat(b.get(PATH).body()).contains("\"variant\":\"GENTLE\"");
    }

    @Test
    void afterArchivingThePlanTheNewOneFollowsTheCurrentGoal() throws Exception {
        TestBrowser b = user(); setGoal(b, "166", "86", "78.5");
        String id = goalId(b.post(PATH, start()).body());
        setGoal(b, "175", "60", "66");
        assertThat(b.send("PATCH", "/api/v1/goals/" + id, "{\"status\":\"ARCHIVED\"}", true).statusCode()).isEqualTo(200);
        HttpResponse<String> r = b.post(PATH, start());
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.body()).contains("\"variant\":\"BUILD\"");
    }

    // ---- recovery days (ADR-045) ----
    private static String tomorrow() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1).toString(); }
    private static String from(String date) { return "{\"startDate\":\"" + date + "\"}"; }

    @Test
    void recoveryDaysAreRefusedWithoutAPlanAndCreateNothing() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post(PATH + "/recovery", from(tomorrow()));
        assertThat(r.statusCode()).as(r.body()).isEqualTo(409);
        assertThat(r.body()).contains("PLAN_NOT_STARTED");
        assertThat(b.get("/api/v1/habits").body()).isEqualTo("[]");
    }

    @Test
    void recoveryDaysAreAddedOnceToAPlanThatLacksThemFromTheGivenDay() throws Exception {
        TestBrowser b = user();
        goalId(b.post(PATH, start()).body());
        // An account that started before the recovery days existed: archive them, then add them back.
        for (String title : new String[] {"Đi bộ nhanh", "Giãn cơ phục hồi"}) {
            Matcher m = Pattern.compile("\\{\"id\":\"([^\"]+)\"[^{}]*?\"title\":\"" + title + "\"").matcher(b.get("/api/v1/habits").body());
            assertThat(m.find()).as(title).isTrue();
            assertThat(b.send("PATCH", "/api/v1/habits/" + m.group(1), "{\"status\":\"ARCHIVED\"}", true).statusCode()).isEqualTo(200);
        }
        HttpResponse<String> r = b.post(PATH + "/recovery", from(tomorrow()));
        assertThat(r.statusCode()).as(r.body()).isEqualTo(200);
        assertThat(r.body()).contains("Buổi A", "Đi bộ nhanh", "Giãn cơ phục hồi", "\"weekdays\":[2,6]", "\"weekdays\":[4]");
        String again = b.post(PATH + "/recovery", from(tomorrow())).body();
        assertThat(again.split("Đi bộ nhanh", -1)).as("added only once").hasSize(r.body().split("Đi bộ nhanh", -1).length);
    }

    @Test
    void recoveryDaysAreIdempotentOnAFreshPlan() throws Exception {
        TestBrowser b = user();
        b.post(PATH, start());
        int before = b.get("/api/v1/habits").body().split("\"goalId\"", -1).length;
        assertThat(b.post(PATH + "/recovery", from(tomorrow())).statusCode()).isEqualTo(200);
        assertThat(b.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(before);
    }

    @Test
    void aBadDayIsRefusedForTheRecoveryDays() throws Exception {
        TestBrowser b = user();
        b.post(PATH, start());
        assertThat(b.post(PATH + "/recovery", from("not-a-date")).statusCode()).isEqualTo(422);
    }

    private static String olderPlan(String title) {
        return "{\"startDate\":\"" + today() + "\",\"goals\":[{\"title\":\"" + title + "\",\"category\":\"HEALTH\",\"description\":\"cũ\",\"habits\":["
            + "{\"title\":\"Buổi cũ\",\"targetMinutes\":50,\"xpReward\":40,\"weekdays\":[1],\"objectives\":[{\"title\":\"Leg Press\",\"target\":36,\"unit\":\"rep\",\"step\":12}]}]}]}";
    }

    @Test
    void recoveryDaysAlsoGoToAnOlderGymPlanNotStartedFromTheStandardPlan() throws Exception {
        for (String title : new String[] {"Gym — Chương trình cũ", "Chương trình của tôi"}) {
            TestBrowser b = user();
            assertThat(b.post("/api/v1/imports/habit-plans", olderPlan(title)).statusCode()).isEqualTo(201);
            HttpResponse<String> r = b.post(PATH + "/recovery", from(tomorrow()));
            assertThat(r.statusCode()).as(title + ": " + r.body()).isEqualTo(200);
            assertThat(r.body()).contains("Buổi cũ", "Đi bộ nhanh", "Giãn cơ phục hồi");
        }
    }
}
