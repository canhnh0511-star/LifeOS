package app.lifeos.analytics;

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
class AnalyticsIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")); }
    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private String habit(TestBrowser b, String category, int xp) throws Exception {
        String goal = TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"" + category + "\",\"description\":\"\"}").body());
        HttpResponse<String> r = b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"H\",\"targetMinutes\":30,\"xpReward\":" + xp
            + ",\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"}");
        assertThat(r.statusCode()).as(r.body()).isEqualTo(201);
        return TestBrowser.idOf(r.body());
    }
    private void backdate(String habit, int days) {
        jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", days, UUID.fromString(habit));
        jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", days, UUID.fromString(habit));
    }
    private HttpResponse<String> put(TestBrowser b, String habit, LocalDate d) throws Exception { return b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true); }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private void moveJourney(TestBrowser b, LocalDate start) throws Exception {
        b.get("/api/v1/journeys/current");
        jdbc.update("UPDATE journeys SET start_date = ? WHERE user_id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1)", java.sql.Date.valueOf(start));
    }
    /** Journey placed far in the future so no boss date falls inside the windows under test (boss scheduling has its own test). */
    private void journeyFarAway(TestBrowser b) throws Exception { moveJourney(b, today().plusDays(200)); }

    @Test
    void requiresASession() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        anon.get("/api/v1/me");
        assertThat(anon.get("/api/v1/analytics/weekly").statusCode()).isEqualTo(401);
        assertThat(anon.get("/api/v1/analytics/monthly").statusCode()).isEqualTo(401);
    }

    @Test
    void emptyUserGetsZeroedFullWindowsAndAllFiveAreas() throws Exception {
        TestBrowser b = user();
        journeyFarAway(b);
        String week = b.get("/api/v1/analytics/weekly").body();
        assertThat(week).contains("\"period\":\"7d\"", "\"completionRate\":0", "\"scheduledCount\":0", "\"earnedXp\":0", "\"previous\":{");
        assertThat(week).contains("\"date\":\"" + today() + "\"", "\"date\":\"" + today().minusDays(6) + "\"").doesNotContain("\"date\":\"" + today().minusDays(7) + "\"");
        for (String c : new String[] {"CAREER", "CREATIVITY", "HEALTH", "KNOWLEDGE", "MINDFULNESS"}) assertThat(week).contains("{\"category\":\"" + c + "\",\"scheduled\":0,\"completed\":0}");
        String month = b.get("/api/v1/analytics/monthly").body();
        assertThat(month).contains("\"period\":\"30d\"", "\"date\":\"" + today().minusDays(29) + "\"").doesNotContain("\"date\":\"" + today().minusDays(30) + "\"");
    }

    @Test
    void dayStatsAndRateComeFromScheduleAndLedger() throws Exception {
        TestBrowser b = user();
        journeyFarAway(b);
        String h = habit(b, "HEALTH", 40);
        backdate(h, 3);
        put(b, h, today().minusDays(2)); put(b, h, today());   // 4 sessions (3 back .. today), 2 done
        String week = b.get("/api/v1/analytics/weekly").body();
        assertThat(num(week, "scheduledCount")).isEqualTo(4);
        assertThat(num(week, "completedCount")).isEqualTo(2);
        assertThat(num(week, "completionRate")).isEqualTo(50);
        assertThat(num(week, "earnedXp")).isEqualTo(80);
        assertThat(week).contains("{\"date\":\"" + today() + "\",\"scheduled\":1,\"completed\":1,\"xpEarned\":40}")
            .contains("{\"date\":\"" + today().minusDays(1) + "\",\"scheduled\":1,\"completed\":0,\"xpEarned\":0}")
            .contains("{\"category\":\"HEALTH\",\"scheduled\":4,\"completed\":2}")
            .contains("{\"category\":\"CAREER\",\"scheduled\":0,\"completed\":0}");
    }

    @Test
    void completionRateRoundsToTheNearestPercent() throws Exception {
        TestBrowser b = user();
        journeyFarAway(b);
        String h = habit(b, "CAREER", 10);
        backdate(h, 2); // 3 sessions
        put(b, h, today());
        assertThat(num(b.get("/api/v1/analytics/weekly").body(), "completionRate")).isEqualTo(33);
        put(b, h, today().minusDays(1));
        assertThat(num(b.get("/api/v1/analytics/weekly").body(), "completionRate")).isEqualTo(67);
    }

    @Test
    void anUndoneDayLeavesNoXpInTheChart() throws Exception {
        TestBrowser b = user();
        journeyFarAway(b);
        String h = habit(b, "CAREER", 30);
        put(b, h, today());
        b.send("DELETE", "/api/v1/quests/" + h + "/dates/" + today() + "/completion", null, true);
        String week = b.get("/api/v1/analytics/weekly").body();
        assertThat(num(week, "earnedXp")).isZero();
        assertThat(week).contains("{\"date\":\"" + today() + "\",\"scheduled\":1,\"completed\":0,\"xpEarned\":0}");
    }

    @Test
    void pausingNeverRewritesDaysAlreadyLived() throws Exception {
        TestBrowser b = user();
        journeyFarAway(b);
        String h = habit(b, "CAREER", 20);
        put(b, h, today());
        b.patch("/api/v1/habits/" + h, "{\"status\":\"PAUSED\"}");
        String week = b.get("/api/v1/analytics/weekly").body();
        assertThat(week).contains("{\"date\":\"" + today() + "\",\"scheduled\":1,\"completed\":1,\"xpEarned\":20}");
        assertThat(num(week, "scheduledCount")).isEqualTo(1);
    }

    @Test
    void thePreviousPeriodHoldsTheSameLengthWindowBefore() throws Exception {
        TestBrowser b = user();
        journeyFarAway(b);
        String h = habit(b, "KNOWLEDGE", 25);
        backdate(h, 10);
        put(b, h, today().minusDays(6));
        // Previous window = 13..7 days back; the habit started 10 back, so 4 sessions (10..7 back), none done.
        String body = b.get("/api/v1/analytics/weekly").body();
        int at = body.indexOf("\"previous\":");
        String previous = body.substring(at);
        assertThat(num(previous, "scheduledCount")).isEqualTo(4);
        assertThat(num(previous, "completedCount")).isZero();
        assertThat(previous).doesNotContain("\"days\"");
        assertThat(num(body.substring(0, at), "completedCount")).isEqualTo(1);
    }

    @Test
    void aBossIsScheduledOnItsBossDateInItsCategory() throws Exception {
        TestBrowser b = user();
        moveJourney(b, today().minusDays(6)); // chapter 1 (day 7) ends today
        String week = b.get("/api/v1/analytics/weekly").body();
        assertThat(num(week, "scheduledCount")).isEqualTo(1);
        assertThat(week).contains("{\"date\":\"" + today() + "\",\"scheduled\":1,\"completed\":0,\"xpEarned\":0}")
            .contains("{\"category\":\"MINDFULNESS\",\"scheduled\":1,\"completed\":0}");
    }

    @Test
    void otherUsersDataNeverLeaks() throws Exception {
        TestBrowser alice = user(), bob = user();
        journeyFarAway(bob);
        put(alice, habit(alice, "CAREER", 50), today());
        String week = bob.get("/api/v1/analytics/weekly").body();
        assertThat(num(week, "scheduledCount")).isZero();
        assertThat(num(week, "earnedXp")).isZero();
    }
}
