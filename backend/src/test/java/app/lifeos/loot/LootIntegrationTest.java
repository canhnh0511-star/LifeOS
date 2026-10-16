package app.lifeos.loot;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "lifeos.daily-rewards.enabled=true")
class LootIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }
    private static LocalDate ago(int days) { return today().minusDays(days); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private UUID userId(TestBrowser b) throws Exception { return UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body())); }

    /** Three daily habits started `backdate` days ago (the minimum for a day to have chests); finishing all three opens every chest. */
    private List<String> habit(TestBrowser b, int backdate) throws Exception {
        String goal = TestBrowser.idOf(b.post("/api/v1/goals", "{\"title\":\"G\",\"category\":\"HEALTH\",\"description\":\"\"}").body());
        List<String> ids = new java.util.ArrayList<>();
        for (int i = 0; i < 3; i++) {
            String id = TestBrowser.idOf(b.post("/api/v1/habits", "{\"goalId\":\"" + goal + "\",\"title\":\"H" + i + "\",\"targetMinutes\":30,\"xpReward\":10,\"weekdays\":[1,2,3,4,5,6,7],\"startDate\":\"" + today() + "\"}").body());
            jdbc.update("UPDATE habits SET start_date = start_date - ? WHERE id = ?", backdate, UUID.fromString(id));
            jdbc.update("UPDATE habit_schedule_versions SET effective_from = effective_from - ? WHERE habit_id = ?", backdate, UUID.fromString(id));
            ids.add(id);
        }
        return ids;
    }
    /** Completes all three quests of a day and returns the bodies joined (chests open on different completions, so the effects are spread over them). */
    private String doneAll(TestBrowser b, List<String> habits, LocalDate d) throws Exception {
        StringBuilder all = new StringBuilder();
        for (String h : habits) all.append(done(b, h, d).body());
        return all.toString();
    }
    private HttpResponse<String> done(TestBrowser b, String habit, LocalDate d) throws Exception { return ok(b.send("PUT", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true)); }
    private HttpResponse<String> undone(TestBrowser b, String habit, LocalDate d) throws Exception { return ok(b.send("DELETE", "/api/v1/quests/" + habit + "/dates/" + d + "/completion", null, true)); }
    private HttpResponse<String> ok(HttpResponse<String> r) { assertThat(r.statusCode()).as(r.body()).isEqualTo(200); return r; }
    private int owned(UUID u) { return jdbc.queryForObject("SELECT count(*) FROM user_items WHERE user_id = ?", Integer.class, u); }
    private List<String> ownedCodes(UUID u) { return jdbc.queryForList("SELECT item_code FROM user_items WHERE user_id = ? ORDER BY item_code", String.class, u); }
    private void give(UUID u, String code, String slot, String key) {
        jdbc.update("INSERT INTO user_items (id, user_id, item_code, slot, source_key, acquired_at) VALUES (?,?,?,?,?,?)", UUID.randomUUID(), u, code, slot, key, java.sql.Timestamp.from(Instant.now()));
    }
    private static final Pattern DROPPED = Pattern.compile("\"type\":\"ITEM_DROPPED\",\"code\":\"([A-Z_]+)\"");

    @Test void aChestDropsOneItemFromItsPoolAndTheDashboardNamesIt() throws Exception {
        TestBrowser b = user();
        String r = doneAll(b, habit(b, 0), today());
        Matcher m = DROPPED.matcher(r);
        List<String> codes = new java.util.ArrayList<>();
        while (m.find()) codes.add(m.group(1));
        assertThat(codes).as("one item per chest: WOOD, SILVER and GOLD all opened").hasSize(3).doesNotHaveDuplicates();
        assertThat(ownedCodes(userId(b))).containsExactlyInAnyOrderElementsOf(codes);
        String dash = b.get("/api/v1/dashboard/today").body();
        assertThat(dash).contains("\"itemCode\":\"" + codes.get(0) + "\"");
        String items = b.get("/api/v1/items").body();
        assertThat(items).contains("\"code\":\"" + codes.get(0) + "\"").contains("\"owned\":true");
        assertThat(r).as("items carry no XP").doesNotContain("\"code\":\"" + codes.get(0) + "\",\"xpDelta\":1");
    }

    @Test void theDropIsReproducibleAndDoesNotRepeatWhatYouOwn() throws Exception {
        assertThat(app.lifeos.loot.service.LootService.pick(UUID.fromString("00000000-0000-0000-0000-000000000001"), LocalDate.parse("2026-10-16"), "WOOD", 5))
            .isEqualTo(app.lifeos.loot.service.LootService.pick(UUID.fromString("00000000-0000-0000-0000-000000000001"), LocalDate.parse("2026-10-16"), "WOOD", 5));
        TestBrowser b = user();
        List<String> h = habit(b, 3);
        for (int i = 3; i >= 0; i--) doneAll(b, h, ago(i));
        UUID u = userId(b);
        // 4 days x 3 chests asked for 12 items from a catalog of 6: never a duplicate, the rest simply do not drop.
        assertThat(ownedCodes(u)).doesNotHaveDuplicates();
        assertThat(owned(u)).isLessThanOrEqualTo(6).isGreaterThanOrEqualTo(3);
    }

    @Test void undoTakesTheItemBackAndUnequipsItAndRedoDropsTheSameOne() throws Exception {
        TestBrowser b = user();
        List<String> h = habit(b, 0);
        String first = doneAll(b, h, today());
        Matcher m = DROPPED.matcher(first);
        assertThat(m.find()).isTrue();
        String code = m.group(1);
        ok(b.send("PUT", "/api/v1/items/" + code + "/equipped", null, true));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_items WHERE user_id = ? AND equipped", Integer.class, userId(b))).isEqualTo(1);

        // 3 quests: undoing one drops SILVER and GOLD, undoing a second drops WOOD (the item we are wearing).
        String undo = undone(b, h.get(0), today()).body() + undone(b, h.get(1), today()).body();
        assertThat(undo).contains("\"type\":\"ITEM_REVOKED\"");
        assertThat(owned(userId(b))).isZero();
        assertThat(b.get("/api/v1/items").body()).doesNotContain("\"owned\":true");

        String again = done(b, h.get(0), today()).body() + done(b, h.get(1), today()).body();
        Matcher m2 = DROPPED.matcher(again);
        assertThat(m2.find()).isTrue();
        assertThat(m2.group(1)).as("same chest, same inventory, same item").isEqualTo(code);
    }

    @Test void equippingSwapsTheSlotAndOnlyOwnedItemsCanBeWorn() throws Exception {
        TestBrowser b = user();
        UUID u = userId(b);
        give(u, "BLANK_PAGES_CHRONICLE", "RELIC", "2026-10-01:SILVER");
        give(u, "NAMELESS_KING_MIRROR", "RELIC", "2026-10-02:GOLD");
        ok(b.send("PUT", "/api/v1/items/BLANK_PAGES_CHRONICLE/equipped", null, true));
        HttpResponse<String> swap = ok(b.send("PUT", "/api/v1/items/NAMELESS_KING_MIRROR/equipped", null, true));
        assertThat(swap.body()).contains("\"equipped\":true");
        assertThat(jdbc.queryForList("SELECT item_code FROM user_items WHERE user_id = ? AND equipped", String.class, u)).containsExactly("NAMELESS_KING_MIRROR");
        ok(b.send("DELETE", "/api/v1/items/NAMELESS_KING_MIRROR/equipped", null, true));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_items WHERE user_id = ? AND equipped", Integer.class, u)).isZero();
        assertThat(b.send("PUT", "/api/v1/items/WOLF_FANG_SWORD/equipped", null, true).statusCode()).as("not owned").isEqualTo(404);
        assertThat(b.send("PUT", "/api/v1/items/NOPE/equipped", null, true).statusCode()).isEqualTo(404);
    }

    @Test void anotherUsersItemIsNotMine() throws Exception {
        TestBrowser a = user(); TestBrowser other = user();
        give(userId(a), "WOLF_FANG_SWORD", "WEAPON", "2026-10-01:WOOD");
        assertThat(other.send("PUT", "/api/v1/items/WOLF_FANG_SWORD/equipped", null, true).statusCode()).isEqualTo(404);
        assertThat(other.get("/api/v1/items").body()).doesNotContain("\"owned\":true");
        assertThat(a.get("/api/v1/items").body()).contains("\"owned\":true");
    }

    @Test void anonymousCannotReadTheCatalog() throws Exception {
        TestBrowser anon = new TestBrowser(port);
        assertThat(anon.get("/api/v1/items").statusCode()).isEqualTo(401);
    }
}
