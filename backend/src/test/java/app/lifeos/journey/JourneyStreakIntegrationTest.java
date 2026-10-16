package app.lifeos.journey;

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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class JourneyStreakIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")); }
    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private String habit(TestBrowser b, int xp, String weekdays) throws Exception {
        String goal = TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"CAREER\",\"description\":\"\"}").body());
        HttpResponse<String> r = b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"H\",\"targetMinutes\":30,\"xpReward\":" + xp
            + ",\"weekdays\":" + weekdays + ",\"startDate\":\"" + today() + "\"}");
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private void backdate(String habit, int days) {
        jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", days, UUID.fromString(habit));
        jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", days, UUID.fromString(habit));
    }
    private HttpResponse<String> put(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true); }
    private HttpResponse<String> del(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("DELETE", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true); }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private int streakOf(TestBrowser b) throws Exception { return num(b.get("/api/v1/dashboard/today").body(), "currentStreak"); }
    private int longestOf(TestBrowser b) throws Exception { return num(b.get("/api/v1/dashboard/today").body(), "longestStreak"); }

    @Test
    void journeyRequiresASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(anon.get("/api/v1/journeys/current").statusCode()).isEqualTo(401);
    }

    @Test
    void aNewUserGetsA66DayJourneyStartingTodayWithFourChaptersAndBosses() throws Exception {
        TestBrowser b = user();
        String body = b.get("/api/v1/journeys/current").body();
        LocalDate t = today();
        assertThat(body).contains("\"title\":\"The 66-Day Reset\"", "\"startDate\":\"" + t + "\"", "\"durationDays\":66", "\"elapsedDays\":1",
            "\"totalScheduledToDate\":0", "\"completedToDate\":0", "\"status\":\"ACTIVE\"");
        assertThat(body).contains("\"index\":1", "\"startDate\":\"" + t + "\"", "\"endDate\":\"" + t.plusDays(6) + "\"")   // chapter 1: days 1-7
            .contains("\"endDate\":\"" + t.plusDays(20) + "\"", "\"endDate\":\"" + t.plusDays(43) + "\"", "\"endDate\":\"" + t.plusDays(65) + "\"") // 21, 44, 66
            .contains("\"bossDate\":\"" + t.plusDays(6) + "\"", "\"code\":\"SLIME_OF_INERTIA\"", "\"tier\":5");
        // Level-1 areas: the level-1 boss is available, the rest are locked.
        assertThat(body).containsPattern("SLIME_OF_INERTIA[^}]*\"status\":\"AVAILABLE\"").containsPattern("TROLL_OF_BURNOUT[^}]*\"status\":\"LOCKED\"")
            .containsPattern("DRAGON_OF_PROCRASTINATION[^}]*\"status\":\"LOCKED\"");
        assertThat(body).contains("\"badge\":{\"code\":\"CHAPTER_1\"", "\"earned\":false");
    }

    @Test
    void theSameJourneyIsReturnedEveryTimeAndOnTheDashboard() throws Exception {
        TestBrowser b = user();
        String id = TestBrowser.idOf(b.get("/api/v1/journeys/current").body());
        assertThat(TestBrowser.idOf(b.get("/api/v1/journeys/current").body())).isEqualTo(id);
        assertThat(b.get("/api/v1/dashboard/today").body()).contains("\"journey\":{\"id\":\"" + id + "\"");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM journeys j JOIN users u ON u.id = j.user_id WHERE j.id = ?", Integer.class, UUID.fromString(id))).isEqualTo(1);
    }

    @Test
    void journeysAreSeparatePerUser() throws Exception {
        TestBrowser a = user(), b = user();
        assertThat(TestBrowser.idOf(a.get("/api/v1/journeys/current").body())).isNotEqualTo(TestBrowser.idOf(b.get("/api/v1/journeys/current").body()));
    }

    @Test
    void theJourneyStartsOnTheUsersLocalRegistrationDay() throws Exception {
        TestBrowser b = user();
        jdbc.update("UPDATE users SET timezone = 'Pacific/Kiritimati', created_at = '2026-01-01T12:00:00Z' WHERE id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)");
        String body = b.get("/api/v1/journeys/current").body();
        // 2026-01-01 12:00 UTC is already 2 January in UTC+14. The 66 days (2 Jan - 8 Mar) are long over today.
        assertThat(body).contains("\"startDate\":\"2026-01-02\"", "\"elapsedDays\":66", "\"status\":\"COMPLETED\"");
    }

    @Test
    void effortAndTimelineAreCountedSeparately() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 20, "[1,2,3,4,5,6,7]");
        assertThat(b.get("/api/v1/journeys/current").body()).contains("\"totalScheduledToDate\":1", "\"completedToDate\":0", "\"elapsedDays\":1");
        put(b, h, today());
        assertThat(b.get("/api/v1/journeys/current").body()).contains("\"totalScheduledToDate\":1", "\"completedToDate\":1");
        del(b, h, today());
        assertThat(b.get("/api/v1/journeys/current").body()).contains("\"completedToDate\":0");
    }

    @Test
    void completingTodayStartsTheStreakAndUndoTakesItBack() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 20, "[1,2,3,4,5,6,7]");
        assertThat(streakOf(b)).isZero();
        HttpResponse<String> r = put(b, h, today());
        assertThat(num(r.body(), "streak")).isEqualTo(1);
        assertThat(streakOf(b)).isEqualTo(1);
        assertThat(longestOf(b)).isEqualTo(1);
        assertThat(num(del(b, h, today()).body(), "streak")).isZero();
        assertThat(streakOf(b)).isZero();
    }

    @Test
    void consecutiveDaysBuildTheStreakAndPendingTodayKeepsIt() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 20, "[1,2,3,4,5,6,7]");
        backdate(h, 5);
        for (int i = 3; i >= 1; i--) put(b, h, today().minusDays(i));
        assertThat(streakOf(b)).isEqualTo(3); // today still pending
        put(b, h, today());
        assertThat(streakOf(b)).isEqualTo(4);
    }

    @Test
    void aMissedScheduledDayBreaksTheStreakButLongestRemembers() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 20, "[1,2,3,4,5,6,7]");
        backdate(h, 6);
        for (int i : new int[] {5, 4, 3}) put(b, h, today().minusDays(i));
        put(b, h, today().minusDays(1)); // the 2-days-ago session was missed
        assertThat(streakOf(b)).isEqualTo(1);
        assertThat(longestOf(b)).isEqualTo(3);
    }

    @Test
    void aPausedStretchIsNotRequiredSoItDoesNotBreakTheStreak() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 20, "[1,2,3,4,5,6,7]");
        backdate(h, 6);
        put(b, h, today().minusDays(5)); put(b, h, today().minusDays(4));
        // Paused from 3 days ago, resumed today: the two paused-out days are not sessions.
        jdbc.update("INSERT INTO lifecycle_events (id, user_id, subject_type, subject_id, effective_date, status, created_at) SELECT ?, user_id, 'HABIT', id, ?, 'PAUSED', now() FROM habits WHERE id = ?",
            UUID.randomUUID(), java.sql.Date.valueOf(today().minusDays(3)), UUID.fromString(h));
        jdbc.update("INSERT INTO lifecycle_events (id, user_id, subject_type, subject_id, effective_date, status, created_at) SELECT ?, user_id, 'HABIT', id, ?, 'ACTIVE', now() FROM habits WHERE id = ?",
            UUID.randomUUID(), java.sql.Date.valueOf(today().minusDays(0)), UUID.fromString(h));
        assertThat(streakOf(b)).isEqualTo(2);
    }

    @Test
    void aWeekdayHabitIsNotBrokenByTheWeekend() throws Exception {
        TestBrowser b = user();
        String h = habit(b, 20, "[1,2,3,4,5]");
        backdate(h, 14);
        // Complete every weekday of the last 14 days (excluding today): the weekend gaps must not matter.
        int expected = 0;
        for (int i = 14; i >= 1; i--) {
            LocalDate d = today().minusDays(i);
            if (d.getDayOfWeek().getValue() <= 5 && i <= 7) { put(b, h, d); expected++; }
        }
        // Days 8..14 back were not completed, so the run is only the last 7 days' weekdays.
        assertThat(streakOf(b)).isEqualTo(expected);
    }

    @Test
    void theHabitsOfOtherUsersNeverCount() throws Exception {
        TestBrowser alice = user(), bob = user();
        String h = habit(alice, 20, "[1,2,3,4,5,6,7]");
        put(alice, h, today());
        assertThat(streakOf(alice)).isEqualTo(1);
        assertThat(streakOf(bob)).isZero();
    }
}
