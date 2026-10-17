package app.lifeos.workout;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** ADR-038: training badges and set statistics are read-only views over real data; they never move XP. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WorkoutInsightsIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")); }
    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private String habit(TestBrowser b, String objectives) throws Exception {
        String goal = TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"Gym\",\"category\":\"HEALTH\",\"description\":\"\"}").body());
        HttpResponse<String> r = b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"Buổi A\",\"targetMinutes\":45,\"xpReward\":40,\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"" + (objectives == null ? "" : ",\"objectives\":" + objectives) + "}");
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private HttpResponse<String> putSet(TestBrowser b, String habit, String exercise, int setNo, int reps, String weight) throws Exception {
        return b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + today() + "/sets", "{\"exercise\":\"" + exercise + "\",\"setNo\":" + setNo + ",\"reps\":" + reps + ",\"weightKg\":" + weight + "}", true);
    }
    private String objectiveId(TestBrowser b, String habit) throws Exception {
        String body = b.get("/api/v1/quests?date=" + today()).body();
        int at = body.indexOf("\"objectives\":[", body.indexOf("\"habitId\":\"" + habit + "\""));
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(body.substring(at));
        assertThat(m.find()).isTrue();
        return m.group(1);
    }
    private long xp(TestBrowser b) throws Exception {
        Matcher m = Pattern.compile("\"totalXp\":(\\d+)").matcher(b.get("/api/v1/dashboard/today").body());
        assertThat(m.find()).isTrue();
        return Long.parseLong(m.group(1));
    }
    private String badge(String body, String code) { int i = body.indexOf(code); return body.substring(i, body.indexOf("}", i)); }

    @Test void endpointsRequireASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(anon.get("/api/v1/badges").statusCode()).isEqualTo(401);
        assertThat(anon.get("/api/v1/workout-stats").statusCode()).isEqualTo(401);
    }

    @Test void aNewUserHasNoBadgesAndEmptyStats() throws Exception {
        TestBrowser b = user();
        String badges = b.get("/api/v1/badges").body();
        assertThat(badge(badges, "BADGE_FIRST_WORKOUT")).contains("\"earned\":false", "\"progress\":0", "\"target\":1");
        assertThat(badge(badges, "BADGE_100_SETS")).contains("\"earned\":false", "\"target\":100");
        String stats = b.get("/api/v1/workout-stats").body();
        assertThat(stats).contains("\"sessions\":0", "\"exercises\":[]");
        assertThat(stats.split("\"date\"").length - 1).isEqualTo(7);
    }

    @Test void aCompletedSessionWithAnExerciseListEarnsTheBadgeAndUndoTakesItBack() throws Exception {
        TestBrowser b = user();
        String h = habit(b, "[{\"title\":\"Machine Chest Press\",\"target\":2,\"unit\":\"rep\",\"step\":1}]");
        long before = xp(b);
        assertThat(b.send("PUT", "/api/v1/quests/" + h + "/dates/" + today() + "/objectives/" + objectiveId(b, h), "{\"value\":2}", true).statusCode()).isEqualTo(200);
        String earned = b.get("/api/v1/badges").body();
        assertThat(badge(earned, "BADGE_FIRST_WORKOUT")).contains("\"earned\":true", "\"progress\":1");
        assertThat(badge(earned, "BADGE_10_SESSIONS")).contains("\"earned\":false", "\"progress\":1", "\"target\":10");
        assertThat(xp(b) - before).as("the quest pays its own XP, the badge adds nothing").isEqualTo(40);
        assertThat(b.send("DELETE", "/api/v1/quests/" + h + "/dates/" + today() + "/completion", null, true).statusCode()).isEqualTo(200);
        assertThat(badge(b.get("/api/v1/badges").body(), "BADGE_FIRST_WORKOUT")).contains("\"earned\":false");
        assertThat(xp(b)).isEqualTo(before);
    }

    @Test void aHabitWithoutAnExerciseListIsNotATrainingSession() throws Exception {
        TestBrowser b = user();
        String h = habit(b, null);
        assertThat(b.send("PUT", "/api/v1/quests/" + h + "/dates/" + today() + "/completion", null, true).statusCode()).isEqualTo(200);
        assertThat(badge(b.get("/api/v1/badges").body(), "BADGE_FIRST_WORKOUT")).contains("\"earned\":false", "\"progress\":0");
    }

    @Test void loggedSetsCountTowardTheSetsBadgeAndAreAggregatedPerExercise() throws Exception {
        TestBrowser b = user();
        String h = habit(b, null);
        long before = xp(b);
        putSet(b, h, "Machine Chest Press", 1, 10, "40");
        putSet(b, h, "machine chest press", 2, 8, "42.5");
        putSet(b, h, "Plank", 1, 45, "null");
        String stats = b.get("/api/v1/workout-stats?days=7").body();
        assertThat(stats).contains("\"sessions\":1");
        assertThat(stats).contains("\"sets\":3}"); // today's bar
        assertThat(stats).contains("\"sets\":2,\"reps\":18,\"volumeKg\":740.00");
        assertThat(stats.indexOf("Machine Chest Press")).isLessThan(stats.indexOf("Plank")); // heaviest first
        assertThat(badge(b.get("/api/v1/badges").body(), "BADGE_100_SETS")).contains("\"progress\":3", "\"earned\":false");
        assertThat(xp(b)).as("logging sets never moves XP").isEqualTo(before);
        UUID u = UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body()));
        for (int n = 3; n <= 50; n++) jdbc.update("INSERT INTO workout_sets (id, user_id, habit_id, entry_date, exercise, set_no, reps, weight_kg, created_at, updated_at) VALUES (?, ?, ?, ?, 'Leg Press', ?, 10, NULL, now(), now())", UUID.randomUUID(), u, UUID.fromString(h), java.sql.Date.valueOf(today()), n);
        for (int n = 1; n <= 50; n++) jdbc.update("INSERT INTO workout_sets (id, user_id, habit_id, entry_date, exercise, set_no, reps, weight_kg, created_at, updated_at) VALUES (?, ?, ?, ?, 'Seated Row', ?, 10, NULL, now(), now())", UUID.randomUUID(), u, UUID.fromString(h), java.sql.Date.valueOf(today()), n);
        assertThat(badge(b.get("/api/v1/badges").body(), "BADGE_100_SETS")).contains("\"earned\":true", "\"progress\":100");
    }

    @Test void statisticsOnlyCoverTheCallersOwnSetsAndRejectABadRange() throws Exception {
        TestBrowser a = user(), other = user();
        String h = habit(a, null);
        putSet(a, h, "Plank", 1, 45, "null");
        assertThat(other.get("/api/v1/workout-stats").body()).contains("\"sessions\":0", "\"exercises\":[]");
        for (String bad : new String[] {"0", "91", "-3"}) {
            HttpResponse<String> r = a.get("/api/v1/workout-stats?days=" + bad);
            assertThat(r.statusCode()).as(bad).isEqualTo(422);
            assertThat(r.body()).contains("days");
        }
        HttpResponse<String> text = a.get("/api/v1/workout-stats?days=abc");
        assertThat(text.statusCode()).isEqualTo(422);
        assertThat(text.body()).contains("days");
    }
}
