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
        assertThat(r.body()).contains("\"started\":false", "\"goalId\":null", "\"habitId\":null", "Buổi A", "Buổi B", "Buổi C", "Leg Press", "Bird Dog", "\"weekdays\":[1]", "\"weekdays\":[3]", "\"weekdays\":[5]");
        assertThat(b.get("/api/v1/goals").body()).isEqualTo("[]");
        assertThat(b.get("/api/v1/habits").body()).isEqualTo("[]");
    }

    @Test
    void startingCreatesTheAccountsOwnGoalAndThreeSessions() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post(PATH, start());
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        assertThat(r.body()).contains("\"started\":true", "Buổi A", "Buổi B", "Buổi C", "\"target\":36", "\"unit\":\"giây\"", "\"step\":30");
        assertThat(r.body()).doesNotContain("\"habitId\":null");
        assertThat(b.get("/api/v1/goals").body()).contains("Tăng cơ · giảm mỡ toàn thân");
        assertThat(b.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(4);
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
        assertThat(b.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(4);
    }

    @Test
    void everyAccountHasItsOwnPlan() throws Exception {
        TestBrowser a = user(), c = user();
        String planA = a.post(PATH, start()).body();
        assertThat(c.get(PATH).body()).contains("\"started\":false");
        String planC = c.post(PATH, start()).body();
        assertThat(goalId(planC)).isNotEqualTo(goalId(planA));
        assertThat(a.get("/api/v1/habits").body().split("\"goalId\"", -1)).hasSize(4);
    }

    @Test
    void aBadStartDateIsRefusedAndCreatesNothing() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> r = b.post(PATH, "{\"startDate\":\"not-a-date\"}");
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("\"code\":\"VALIDATION_FAILED\"");
        assertThat(b.get("/api/v1/goals").body()).isEqualTo("[]");
    }
}
