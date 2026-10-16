package app.lifeos.measure;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.List;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MeasurementIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static LocalDate today() { return LocalDate.now(ZONE); }

    private TestBrowser user() throws Exception { TestBrowser b = new TestBrowser(port); b.signUp(); return b; }
    private UUID userId(TestBrowser b) throws Exception { return UUID.fromString(TestBrowser.idOf(b.get("/api/v1/me").body())); }
    private HttpResponse<String> ok(HttpResponse<String> r) { org.assertj.core.api.Assertions.assertThat(r.statusCode()).as(r.body()).isIn(200, 201, 204); return r; }
    /** The id of the default metric called `name`. */
    private String metricId(TestBrowser b, String name) throws Exception {
        String all = b.get("/api/v1/metrics").body();
        int at = all.indexOf("\"name\":\"" + name + "\"");
        int idAt = all.lastIndexOf("\"id\":\"", at);
        return all.substring(idAt + 6, all.indexOf('"', idAt + 6));
    }
    private HttpResponse<String> put(TestBrowser b, String metric, LocalDate d, String value) throws Exception { return b.send("PUT", "/api/v1/metrics/" + metric + "/entries/" + d, "{\"value\":" + value + "}", true); }

    @Test void theThreeDefaultMetricsAppearOnFirstReadAndOnlyOnce() throws Exception {
        TestBrowser b = user();
        String first = b.get("/api/v1/metrics").body();
        assertThat(first).contains("Cân nặng", "Vòng eo", "Mỡ cơ thể", "\"builtin\":true");
        b.get("/api/v1/metrics");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM metrics WHERE user_id = ?", Integer.class, userId(b))).isEqualTo(3);
    }

    @Test void recordingIsIdempotentByDayAndReplacesTheValue() throws Exception {
        TestBrowser b = user();
        String weight = metricId(b, "Cân nặng");
        ok(put(b, weight, today(), "72.5"));
        HttpResponse<String> again = ok(put(b, weight, today(), "72.346"));
        assertThat(again.body()).contains("\"value\":72.35").doesNotContain("72.5");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM measurements WHERE metric_id = ?", Integer.class, UUID.fromString(weight))).isEqualTo(1);
        ok(put(b, weight, today().minusDays(3), "73"));
        String list = b.get("/api/v1/metrics").body();
        assertThat(list.indexOf(today().minusDays(3).toString())).isLessThan(list.indexOf(today().toString())); // oldest first
    }

    @Test void removingADayTakesItOutAndRemovingAnEmptyDayIsHarmless() throws Exception {
        TestBrowser b = user();
        String waist = metricId(b, "Vòng eo");
        ok(put(b, waist, today(), "80"));
        HttpResponse<String> gone = ok(b.send("DELETE", "/api/v1/metrics/" + waist + "/entries/" + today(), null, true));
        assertThat(gone.body()).contains("\"entries\":[]");
        ok(b.send("DELETE", "/api/v1/metrics/" + waist + "/entries/" + today(), null, true));
    }

    @Test void aCustomMetricCreatedFirstDoesNotPreventTheDefaults() throws Exception {
        TestBrowser b = user();
        ok(b.post("/api/v1/metrics", "{\"name\":\"Vòng đùi\",\"unit\":\"cm\"}"));
        assertThat(b.get("/api/v1/metrics").body()).contains("Cân nặng", "Vòng eo", "Mỡ cơ thể", "Vòng đùi");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM metrics WHERE user_id = ?", Integer.class, userId(b))).isEqualTo(4);
    }

    @Test void anOldValueCanStillBeDeletedEvenThoughItCannotBeRecordedAnymore() throws Exception {
        TestBrowser b = user();
        String weight = metricId(b, "Cân nặng");
        LocalDate old = today().minusDays(400);
        jdbc.update("INSERT INTO measurements (id, metric_id, user_id, entry_date, value, created_at, updated_at) VALUES (?,?,?,?,?,now(),now())", UUID.randomUUID(), UUID.fromString(weight), userId(b), java.sql.Date.valueOf(old), 70);
        assertThat(b.send("DELETE", "/api/v1/metrics/" + weight + "/entries/" + old, null, true).statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM measurements WHERE user_id = ?", Integer.class, userId(b))).isZero();
    }

    @Test void invalidValuesAndDatesAreFieldErrors() throws Exception {
        TestBrowser b = user();
        String weight = metricId(b, "Cân nặng");
        for (String bad : new String[] {"\"x\"", "0", "-5", "100001", "null", "true"}) {
            HttpResponse<String> r = put(b, weight, today(), bad);
            assertThat(r.statusCode()).as(bad).isEqualTo(422);
            assertThat(r.body()).contains("value");
        }
        assertThat(put(b, weight, today().plusDays(1), "70").body()).contains("date");
        assertThat(put(b, weight, today().minusDays(400), "70").statusCode()).isEqualTo(422);
        assertThat(b.send("PUT", "/api/v1/metrics/" + weight + "/entries/not-a-date", "{\"value\":70}", true).statusCode()).isEqualTo(422);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM measurements WHERE user_id = ?", Integer.class, userId(b))).isZero();
    }

    @Test void customMetricsAreCreatedValidatedAndDeletedButDefaultsAreKept() throws Exception {
        TestBrowser b = user();
        HttpResponse<String> made = ok(b.post("/api/v1/metrics", "{\"name\":\"  Vòng bắp tay \",\"unit\":\"cm\"}"));
        assertThat(made.statusCode()).isEqualTo(201);
        assertThat(made.body()).contains("\"name\":\"Vòng bắp tay\"", "\"builtin\":false");
        String id = TestBrowser.idOf(made.body());
        assertThat(b.post("/api/v1/metrics", "{\"name\":\"vòng BẮP tay\",\"unit\":\"\"}").statusCode()).as("same name, any case").isEqualTo(422);
        assertThat(b.post("/api/v1/metrics", "{\"name\":\"\",\"unit\":\"cm\"}").statusCode()).isEqualTo(422);
        assertThat(b.post("/api/v1/metrics", "{\"name\":\"x\",\"unit\":\"mười ba ký tự!\"}").statusCode()).isEqualTo(422);
        ok(put(b, id, today(), "35"));
        assertThat(b.send("DELETE", "/api/v1/metrics/" + id, null, true).statusCode()).isEqualTo(204);
        assertThat(b.get("/api/v1/metrics").body()).doesNotContain("Vòng bắp tay");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM measurements WHERE user_id = ?", Integer.class, userId(b))).isZero();
        assertThat(b.send("DELETE", "/api/v1/metrics/" + metricId(b, "Cân nặng"), null, true).statusCode()).as("defaults stay").isEqualTo(409);
    }

    @Test void aUserCannotReadOrWriteAnotherUsersMetrics() throws Exception {
        TestBrowser a = user(); TestBrowser other = user();
        String weight = metricId(a, "Cân nặng");
        ok(put(a, weight, today(), "70"));
        assertThat(put(other, weight, today(), "50").statusCode()).isEqualTo(404);
        assertThat(other.send("DELETE", "/api/v1/metrics/" + weight, null, true).statusCode()).isEqualTo(404);
        assertThat(other.get("/api/v1/metrics").body()).doesNotContain("\"value\":70");
        assertThat(new TestBrowser(port).get("/api/v1/metrics").statusCode()).isEqualTo(401);
    }

    @Test void measurementsNeverTouchXpOrTheLedger() throws Exception {
        TestBrowser b = user();
        ok(put(b, metricId(b, "Cân nặng"), today(), "70"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM xp_transactions WHERE user_id = ?", Integer.class, userId(b))).isZero();
    }

    @Test void concurrentFirstReadsCreateTheDefaultsOnce() throws Exception {
        TestBrowser b = user();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            List<Future<HttpResponse<String>>> calls = new ArrayList<>();
            for (int i = 0; i < 4; i++) calls.add(pool.submit(() -> b.get("/api/v1/metrics")));
            for (Future<HttpResponse<String>> f : calls) assertThat(f.get().statusCode()).isEqualTo(200);
        } finally { pool.shutdown(); }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM metrics WHERE user_id = ?", Integer.class, userId(b))).isEqualTo(3);
    }
}
