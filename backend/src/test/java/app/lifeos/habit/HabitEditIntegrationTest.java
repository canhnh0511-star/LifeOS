package app.lifeos.habit;

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
class HabitEditIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }
    private static int weekday(LocalDate d) { return d.getDayOfWeek().getValue(); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private String goal(TestBrowser b) throws Exception {
        return TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"HEALTH\",\"description\":\"\"}").body());
    }
    /** Every-day habit that started `backdate` days ago. */
    private String habit(TestBrowser b, String goal, int xp, int backdate) throws Exception {
        String id = TestBrowser.idOf(b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"Gym\",\"targetMinutes\":30,\"xpReward\":" + xp
            + ",\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"}").body());
        jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", backdate, UUID.fromString(id));
        jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", backdate, UUID.fromString(id));
        return id;
    }
    private HttpResponse<String> patch(TestBrowser b, String habit, String json) throws Exception { return b.patch("/api/v1/habits/" + habit, json); }
    private HttpResponse<String> ok(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return r; }
    private boolean hasQuest(TestBrowser b, String habit, LocalDate d) throws Exception {
        return b.get("/api/v1/quests?date=" + d).body().contains("\"habitId\":\"" + habit + "\"");
    }
    private HttpResponse<String> complete(TestBrowser b, String habit, LocalDate d) throws Exception {
        return b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true);
    }
    private static int num(String json, String key) {
        Matcher m = Pattern.compile("\"" + key + "\":(-?\\d+)").matcher(json);
        if (!m.find()) throw new IllegalStateException(key + " missing in " + json);
        return Integer.parseInt(m.group(1));
    }
    private int versions(String habit) { return jdbc.queryForObject("SELECT count(*) FROM habit_schedule_versions WHERE habit_id = ?", Integer.class, UUID.fromString(habit)); }

    @Test void aNewScheduleAppliesFromTomorrowAndNeverRewritesThePast() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 10, 5);
        for (int i = 3; i >= 0; i--) assertThat(complete(b, h, today().minusDays(i)).statusCode()).isEqualTo(200);
        String weeklyBefore = b.get("/api/v1/analytics/weekly").body();
        String progressBefore = b.get("/api/v1/progress").body();

        int t = weekday(today());
        HttpResponse<String> r = ok(patch(b, h, "{\"weekdays\":[" + t + "]}"));
        assertThat(r.body()).contains("\"weekdays\":[" + t + "]");

        assertThat(hasQuest(b, h, today())).isTrue();                 // today is lived: unchanged
        assertThat(hasQuest(b, h, today().plusDays(1))).isFalse();    // from tomorrow on only weekday t
        assertThat(hasQuest(b, h, today().plusDays(7))).isTrue();
        for (int i = 1; i <= 5; i++) assertThat(hasQuest(b, h, today().minusDays(i))).isTrue(); // the past still has its daily quests
        assertThat(b.get("/api/v1/analytics/weekly").body().replaceAll("\"requestId\":\"[^\"]*\"", "")).isEqualTo(weeklyBefore.replaceAll("\"requestId\":\"[^\"]*\"", ""));
        assertThat(b.get("/api/v1/progress").body()).isEqualTo(progressBefore);
        assertThat(versions(h)).isEqualTo(2);
        assertThat(b.get("/api/v1/habits").body()).contains("\"weekdays\":[" + t + "]");
    }

    @Test void twoChangesInOneDayLeaveOnePendingVersionAndAnUnchangedScheduleAddsNone() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 10, 0);
        int t = weekday(today());
        int other = weekday(today().plusDays(3));
        ok(patch(b, h, "{\"weekdays\":[" + t + "]}"));
        ok(patch(b, h, "{\"weekdays\":[" + other + "]}"));
        assertThat(versions(h)).isEqualTo(2);                         // original + one pending (the first change was replaced)
        assertThat(hasQuest(b, h, today().plusDays(3))).isTrue();
        assertThat(hasQuest(b, h, today().plusDays(7))).isFalse();    // weekday t is no longer scheduled after the second change
        ok(patch(b, h, "{\"weekdays\":[" + other + "]}"));
        assertThat(versions(h)).isEqualTo(2);                         // same schedule again: nothing new
        assertThat(hasQuest(b, h, today())).isTrue();                 // today never changed
    }

    @Test void nameDurationAndRewardEditsAreImmediateButMaterializedQuestsKeepTheirReward() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 20, 0);
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"xpReward\":20");   // materializes today's quest
        HttpResponse<String> r = ok(patch(b, h, "{\"title\":\"Gym toàn thân\",\"targetMinutes\":60,\"xpReward\":50}"));
        assertThat(r.body()).contains("\"title\":\"Gym toàn thân\"", "\"targetMinutes\":60", "\"xpReward\":50");
        String todays = b.get("/api/v1/quests?date=" + today()).body();
        assertThat(todays).contains("\"title\":\"Gym toàn thân\"", "\"targetMinutes\":60", "\"xpReward\":20");
        assertThat(b.get("/api/v1/quests?date=" + today().plusDays(1)).body()).contains("\"xpReward\":50");
        assertThat(num(complete(b, h, today()).body(), "xpAwarded")).isEqualTo(20);
    }

    @Test void editingTheRewardNeverChangesWhatALivedDayIsWorth() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 50, 4);
        ok(patch(b, h, "{\"xpReward\":100}"));                                  // days -4..0 were never opened, yet must keep 50
        assertThat(num(complete(b, h, today().minusDays(3)).body(), "xpAwarded")).isEqualTo(50);
        assertThat(num(complete(b, h, today()).body(), "xpAwarded")).isEqualTo(50);
        assertThat(b.get("/api/v1/quests?date=" + today().plusDays(1)).body()).contains("\"xpReward\":100");
    }

    @Test void aHabitThatHasNotStartedYetTakesItsNewScheduleFromItsStartDate() throws Exception {
        TestBrowser b = user();
        String g = goal(b);
        LocalDate start = today().plusDays(14);
        String h = TestBrowser.idOf(b.post("/api/v1/habits", "{\"goalId\":\"" + g + "\",\"title\":\"Later\",\"targetMinutes\":20,\"xpReward\":10,\"weekdays\":[1,2,3],\"startDate\":\"" + start + "\"}").body());
        ok(patch(b, h, "{\"weekdays\":[4,5]}"));
        LocalDate thursday = start.plusDays(((4 - weekday(start)) + 7) % 7);
        LocalDate monday = start.plusDays(((1 - weekday(start)) + 7) % 7);
        assertThat(hasQuest(b, h, thursday)).isTrue();
        assertThat(hasQuest(b, h, monday)).isFalse();
    }

    @Test void resendingTheArchiveRequestIsANoOp() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 10, 0);
        ok(patch(b, h, "{\"status\":\"ARCHIVED\"}"));
        assertThat(ok(patch(b, h, "{\"status\":\"ARCHIVED\"}")).body()).contains("\"status\":\"ARCHIVED\"");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM lifecycle_events WHERE subject_id = ?", Integer.class, UUID.fromString(h))).isEqualTo(1);
    }

    @Test void endDateStopsFutureQuestsCanBeMovedOrClearedButNeverReachIntoThePast() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 10, 3);
        ok(patch(b, h, "{\"endDate\":\"" + today().plusDays(2) + "\"}"));
        assertThat(hasQuest(b, h, today().plusDays(2))).isTrue();
        assertThat(hasQuest(b, h, today().plusDays(3))).isFalse();
        assertThat(b.get("/api/v1/habits").body()).contains("\"endDate\":\"" + today().plusDays(2) + "\"");
        ok(patch(b, h, "{\"endDate\":null}"));
        assertThat(hasQuest(b, h, today().plusDays(3))).isTrue();
        assertThat(patch(b, h, "{\"endDate\":\"" + today().minusDays(1) + "\"}").statusCode()).isEqualTo(422);
        assertThat(patch(b, h, "{\"endDate\":\"2026-13-40\"}").body()).contains("\"endDate\":");
        // Once a habit has ended, its end cannot be lifted: that would bring back days that were already lived without it.
        jdbc.update("UPDATE habits SET end_date = ? WHERE id = ?", today().minusDays(1), UUID.fromString(h));
        HttpResponse<String> reopen = patch(b, h, "{\"endDate\":null}");
        assertThat(reopen.statusCode()).isEqualTo(422);
        assertThat(reopen.body()).contains("\"endDate\":");
    }

    @Test void archivingKeepsHistoryRemovesTheHabitFromTomorrowAndIsFinal() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 30, 0);
        complete(b, h, today());
        assertThat(ok(patch(b, h, "{\"status\":\"ARCHIVED\"}")).body()).contains("\"status\":\"ARCHIVED\"");
        assertThat(hasQuest(b, h, today())).isTrue();                 // today is lived and keeps its completed quest
        assertThat(b.get("/api/v1/quests?date=" + today()).body()).contains("\"status\":\"COMPLETED\"");
        assertThat(hasQuest(b, h, today().plusDays(1))).isFalse();
        assertThat(num(b.get("/api/v1/progress").body(), "totalXp")).isEqualTo(30);
        HttpResponse<String> edit = patch(b, h, "{\"title\":\"again\"}");
        assertThat(edit.statusCode()).isEqualTo(422);
        assertThat(edit.body()).contains("\"patch\":");
        assertThat(patch(b, h, "{\"status\":\"ACTIVE\"}").statusCode()).isEqualTo(422);
    }

    @Test void invalidEditsAreRejectedWithFieldMessagesAndChangeNothing() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 10, 0);
        for (String bad : new String[] {"{}", "{\"unknown\":1}", "{\"title\":\"  \"}", "{\"targetMinutes\":0}", "{\"targetMinutes\":481}", "{\"targetMinutes\":\"x\"}",
                "{\"xpReward\":101}", "{\"xpReward\":-1}", "{\"weekdays\":[]}", "{\"weekdays\":[8]}", "{\"weekdays\":\"all\"}", "{\"status\":\"DONE\"}"}) {
            assertThat(patch(b, h, bad).statusCode()).as(bad).isEqualTo(422);
        }
        // One bad field rejects the whole patch: the valid title is not applied.
        assertThat(patch(b, h, "{\"title\":\"New\",\"xpReward\":500}").statusCode()).isEqualTo(422);
        assertThat(b.get("/api/v1/habits").body()).contains("\"title\":\"Gym\"").doesNotContain("\"title\":\"New\"");
        assertThat(versions(h)).isEqualTo(1);
    }

    @Test void anotherUserCannotEditAHabit() throws Exception {
        TestBrowser alice = user(), bob = user();
        String h = habit(alice, goal(alice), 10, 0);
        assertThat(patch(bob, h, "{\"title\":\"hacked\"}").statusCode()).isEqualTo(404);
        assertThat(patch(bob, h, "{\"weekdays\":[1]}").statusCode()).isEqualTo(404);
        assertThat(alice.get("/api/v1/habits").body()).contains("\"title\":\"Gym\"");
        assertThat(versions(h)).isEqualTo(1);
    }

    @Test void anEditedScheduleKeepsQuestsOnLivedDaysEvenAfterTheNextEdit() throws Exception {
        TestBrowser b = user();
        String h = habit(b, goal(b), 10, 2);
        complete(b, h, today().minusDays(1));
        ok(patch(b, h, "{\"weekdays\":[" + weekday(today().plusDays(2)) + "]}"));
        ok(patch(b, h, "{\"weekdays\":[1,2,3,4,5,6,7]}"));
        assertThat(b.get("/api/v1/quests?date=" + today().minusDays(1)).body()).contains("\"status\":\"COMPLETED\"");
        assertThat(num(b.get("/api/v1/progress").body(), "totalXp")).isEqualTo(10);
    }
}
