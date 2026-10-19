package app.lifeos.measure;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BodyGoalIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;

    private static final String PATH = "/api/v1/body-goal";
    private static String goal(String height, String start, String target, String date, String days) {
        return "{\"heightCm\":" + height + ",\"startWeightKg\":" + start + ",\"targetWeightKg\":" + target + ",\"startDate\":" + date + ",\"days\":" + days + "}";
    }
    private static final String OK = goal("166", "86", "78.5", "\"2026-10-19\"", "100");
    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private HttpResponse<String> put(TestBrowser b, String body) throws Exception { return b.send("PUT", PATH, body, true); }

    @Test void aNewAccountHasNoGoal() throws Exception { assertThat(user().get(PATH).statusCode()).isEqualTo(404); }

    @Test void theGoalIsSavedAndReadBack() throws Exception {
        TestBrowser b = user();
        assertThat(put(b, OK).statusCode()).isEqualTo(200);
        assertThat(b.get(PATH).body()).contains("\"heightCm\":166", "\"startWeightKg\":86.0", "\"targetWeightKg\":78.5", "\"startDate\":\"2026-10-19\"", "\"days\":100");
    }

    @Test void anAccountHasOneGoalAndANewOneReplacesIt() throws Exception {
        TestBrowser b = user();
        put(b, OK);
        put(b, goal("167", "85", "75", "\"2026-11-01\"", "120"));
        assertThat(b.get(PATH).body()).contains("\"heightCm\":167", "\"days\":120", "\"targetWeightKg\":75.0").doesNotContain("78.5");
    }

    @Test void goalsAreNotSharedBetweenAccounts() throws Exception {
        TestBrowser a = user(), other = user();
        put(a, OK);
        assertThat(other.get(PATH).statusCode()).isEqualTo(404);
    }

    @Test void invalidGoalsAreFieldErrorsAndStoreNothing() throws Exception {
        TestBrowser b = user();
        for (String bad : new String[] {goal("90", "86", "78", "\"2026-10-19\"", "100"), goal("166", "10", "78", "\"2026-10-19\"", "100"), goal("166", "86", "86", "\"2026-10-19\"", "100"),
                goal("166", "86", "78", "\"19/10/2026\"", "100"), goal("166", "86", "78", "null", "100"), goal("166", "86", "78", "\"2026-10-19\"", "5"), goal("\"x\"", "86", "78", "\"2026-10-19\"", "100"), "{}"}) {
            HttpResponse<String> r = put(b, bad);
            assertThat(r.statusCode()).as(bad + " " + r.body()).isEqualTo(422);
        }
        assertThat(b.get(PATH).statusCode()).isEqualTo(404);
    }

    @Test void itNeedsSignIn() throws Exception { assertThat(new TestBrowser(port).get(PATH).statusCode()).isEqualTo(401); }
}
