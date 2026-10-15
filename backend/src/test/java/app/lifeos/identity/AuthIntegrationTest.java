package app.lifeos.identity;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Talks to the real server over HTTP so cookie attributes, CSRF and session handling are what a browser would see
 * (MockMvc does not emit session cookies). Cookies are tracked by hand because the Secure flag is on and the test server is plain http.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;

    private static final String PASSWORD = "correct horse battery";
    private static final HttpClient HTTP = HttpClient.newHttpClient();

    /** A minimal browser: remembers cookies and echoes XSRF-TOKEN into X-XSRF-TOKEN like the SPA does. */
    private final class Browser {
        final Map<String, String> jar = new LinkedHashMap<>();
        List<String> lastSetCookies = List.of();

        HttpResponse<String> send(String method, String path, String body, boolean withCsrf) throws Exception {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
            if (body != null) b.header("Content-Type", "application/json");
            if (!jar.isEmpty()) b.header("Cookie", String.join("; ", jar.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).toList()));
            if (withCsrf && jar.containsKey("XSRF-TOKEN")) b.header("X-XSRF-TOKEN", jar.get("XSRF-TOKEN"));
            b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
            HttpResponse<String> r = HTTP.send(b.build(), HttpResponse.BodyHandlers.ofString());
            lastSetCookies = r.headers().allValues("Set-Cookie");
            for (String c : lastSetCookies) {
                String pair = c.split(";", 2)[0];
                int eq = pair.indexOf('=');
                String name = pair.substring(0, eq), value = pair.substring(eq + 1);
                boolean expired = c.toLowerCase().contains("max-age=0") || value.isEmpty();
                if (expired) jar.remove(name); else jar.put(name, value);
            }
            return r;
        }

        HttpResponse<String> get(String path) throws Exception { return send("GET", path, null, true); }
        HttpResponse<String> post(String path, String body) throws Exception { return send("POST", path, body, true); }
        String setCookie(String name) { return lastSetCookies.stream().filter(h -> h.startsWith(name + "=")).findFirst().orElse(null); }
    }

    private static String email() { return "u" + UUID.randomUUID().toString().substring(0, 8) + "@example.com"; }
    private static String reg(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"displayName\":\"Cảnh\"}";
    }
    private static String login(String email, String password) { return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"; }

    /** Browser that has loaded the app once (GET sets the CSRF cookie even on a 401). */
    private Browser visitor() throws Exception {
        Browser b = new Browser();
        assertThat(b.get("/api/v1/me").statusCode()).isEqualTo(401);
        assertThat(b.jar).containsKey("XSRF-TOKEN");
        return b;
    }

    private Browser registered(String email) throws Exception {
        Browser b = visitor();
        assertThat(b.post("/api/v1/auth/register", reg(email, PASSWORD)).statusCode()).isEqualTo(201);
        return b;
    }

    @Test
    void flywayCreatesTheUsersTable() {
        Integer n = jdbc.queryForObject("select count(*) from information_schema.columns where table_name='users' and column_name='password_hash'", Integer.class);
        assertThat(n).isEqualTo(1);
    }

    @Test
    void healthIsPublic() throws Exception {
        HttpResponse<String> r = new Browser().get("/actuator/health");
        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.body()).contains("\"status\":\"UP\"");
    }

    @Test
    void meWithoutSessionIs401InTheContractErrorShape() throws Exception {
        HttpResponse<String> r = new Browser().get("/api/v1/me");
        assertThat(r.statusCode()).isEqualTo(401);
        assertThat(r.headers().firstValue("Content-Type").orElse("")).startsWith("application/json");
        assertThat(r.body()).contains("\"code\":\"UNAUTHENTICATED\"").contains("\"fields\":{}");
    }

    @Test
    void anonymousRequestsDoNotAllocateASession() throws Exception {
        Browser b = new Browser();
        assertThat(b.get("/api/v1/me").statusCode()).isEqualTo(401);
        assertThat(b.setCookie("LIFEOS_SESSION")).isNull();
        assertThat(b.setCookie("XSRF-TOKEN")).isNotNull();
    }

    @Test
    void registerSignsInAndMeMatchesTheUserContract() throws Exception {
        String email = email();
        Browser b = visitor();
        HttpResponse<String> r = b.post("/api/v1/auth/register", reg(email.toUpperCase(), PASSWORD));
        assertThat(r.statusCode()).isEqualTo(201);
        assertThat(r.body()).contains("\"email\":\"" + email + "\"", "\"displayName\":\"Cảnh\"", "\"timezone\":\"Asia/Ho_Chi_Minh\"", "\"id\":\"")
            .doesNotContainIgnoringCase("password");
        HttpResponse<String> me = b.get("/api/v1/me");
        assertThat(me.statusCode()).isEqualTo(200);
        assertThat(me.body()).isEqualTo(r.body());
    }

    @Test
    void sessionCookieIsHttpOnlySecureSameSiteAndTheBodyCarriesNoToken() throws Exception {
        Browser b = visitor();
        HttpResponse<String> r = b.post("/api/v1/auth/register", reg(email(), PASSWORD));
        String session = b.setCookie("LIFEOS_SESSION");
        assertThat(session).isNotNull().contains("HttpOnly").contains("Secure").containsIgnoringCase("SameSite=Lax");
        assertThat(r.body()).doesNotContain(b.jar.get("LIFEOS_SESSION")).doesNotContainIgnoringCase("token");
        String csrf = b.setCookie("XSRF-TOKEN");
        assertThat(csrf).isNotNull().doesNotContain("HttpOnly").contains("Secure");
    }

    @Test
    void passwordIsStoredAsABcryptHash() throws Exception {
        String email = email();
        registered(email);
        String stored = jdbc.queryForObject("select password_hash from users where email=?", String.class, email);
        assertThat(stored).startsWith("$2").doesNotContain(PASSWORD);
    }

    @Test
    void mutationsWithoutAValidCsrfTokenAreRejected() throws Exception {
        Browser noCookie = new Browser();
        HttpResponse<String> r = noCookie.send("POST", "/api/v1/auth/register", reg(email(), PASSWORD), false);
        assertThat(r.statusCode()).isEqualTo(403);
        assertThat(r.body()).contains("\"code\":\"CSRF_INVALID\"");

        // Cookie present but header missing, and header that differs from the cookie: both refused.
        assertThat(visitor().send("POST", "/api/v1/auth/login", login("a@b.co", "x"), false).statusCode()).isEqualTo(403);
        Browser mismatch = visitor();
        mismatch.jar.put("XSRF-TOKEN", "cookie-value");
        HttpRequest forged = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/login"))
            .header("Content-Type", "application/json").header("Cookie", "XSRF-TOKEN=cookie-value").header("X-XSRF-TOKEN", "other-value")
            .POST(HttpRequest.BodyPublishers.ofString(login("a@b.co", "x"))).build();
        assertThat(HTTP.send(forged, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(403);
    }

    @Test
    void duplicateEmailIs409EvenWithDifferentCase() throws Exception {
        String email = email();
        registered(email);
        HttpResponse<String> r = visitor().post("/api/v1/auth/register", reg(email.toUpperCase(), PASSWORD));
        assertThat(r.statusCode()).isEqualTo(409);
        assertThat(r.body()).contains("\"code\":\"EMAIL_TAKEN\"");
    }

    @Test
    void invalidRegistrationIs422WithPerFieldMessages() throws Exception {
        Browser b = visitor();
        HttpResponse<String> r = b.post("/api/v1/auth/register", "{\"email\":\"nope\",\"password\":\"short\",\"displayName\":\"\"}");
        assertThat(r.statusCode()).isEqualTo(422);
        assertThat(r.body()).contains("\"code\":\"VALIDATION_FAILED\"", "\"email\":", "\"password\":", "\"displayName\":");
        HttpResponse<String> tz = b.post("/api/v1/auth/register", "{\"email\":\"" + email() + "\",\"password\":\"" + PASSWORD + "\",\"displayName\":\"A\",\"timezone\":\"Mars/Base\"}");
        assertThat(tz.statusCode()).isEqualTo(422);
        assertThat(tz.body()).contains("\"timezone\":");
    }

    @Test
    void malformedJsonIs400WithoutLeakingInternals() throws Exception {
        HttpResponse<String> r = visitor().post("/api/v1/auth/login", "{not json");
        assertThat(r.statusCode()).isEqualTo(400);
        assertThat(r.body()).contains("\"code\":\"BAD_REQUEST\"").doesNotContain("Exception").doesNotContain("at app.");
    }

    @Test
    void loginWorksAndWrongPasswordLooksTheSameAsUnknownEmail() throws Exception {
        String email = email();
        registered(email);
        Browser b = visitor();
        HttpResponse<String> ok = b.post("/api/v1/auth/login", login(email.toUpperCase(), PASSWORD));
        assertThat(ok.statusCode()).isEqualTo(200);
        assertThat(b.get("/api/v1/me").statusCode()).isEqualTo(200);

        HttpResponse<String> wrong = visitor().post("/api/v1/auth/login", login(email, "wrong-password"));
        HttpResponse<String> unknown = visitor().post("/api/v1/auth/login", login(email(), "wrong-password"));
        assertThat(wrong.statusCode()).isEqualTo(401);
        assertThat(wrong.body()).contains("\"code\":\"INVALID_CREDENTIALS\"").isEqualTo(unknown.body());
    }

    @Test
    void loginIssuesANewSessionIdAndANewCsrfToken() throws Exception {
        String email = email();
        registered(email);
        Browser b = visitor();
        // Establish a pre-login session, then log in with it.
        b.post("/api/v1/auth/login", login(email, "wrong-password"));
        String before = b.jar.get("LIFEOS_SESSION");
        String csrfBefore = b.jar.get("XSRF-TOKEN");
        assertThat(b.post("/api/v1/auth/login", login(email, PASSWORD)).statusCode()).isEqualTo(200);
        assertThat(b.jar.get("LIFEOS_SESSION")).isNotNull().isNotEqualTo(before);
        assertThat(b.jar.get("XSRF-TOKEN")).isNotEqualTo(csrfBefore);
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        Browser b = registered(email());
        String session = b.jar.get("LIFEOS_SESSION");
        assertThat(b.post("/api/v1/auth/logout", null).statusCode()).isEqualTo(204);
        // Replaying the old session cookie must no longer authenticate.
        Browser replay = new Browser();
        replay.jar.put("LIFEOS_SESSION", session);
        assertThat(replay.get("/api/v1/me").statusCode()).isEqualTo(401);
    }

    @Test
    void unknownRoutesAreNormalizedNotHtml() throws Exception {
        Browser b = registered(email());
        HttpResponse<String> r = b.get("/api/v1/nope");
        assertThat(r.statusCode()).isEqualTo(404);
        assertThat(r.body()).contains("\"code\":\"NOT_FOUND\"");
    }
}
