package app.lifeos.common;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** What an operator needs to trace one request: a correlation id everywhere, an access line, and auth audit events without secrets. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ExtendWith(OutputCaptureExtension.class)
class RequestTracingTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;
    private static final HttpClient HTTP = HttpClient.newHttpClient();

    private HttpResponse<String> send(String method, String path, String body, String cookie, String csrf, String requestId) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (body != null) b.header("Content-Type", "application/json");
        if (cookie != null) b.header("Cookie", cookie);
        if (csrf != null) b.header("X-XSRF-TOKEN", csrf);
        if (requestId != null) b.header("X-Request-Id", requestId);
        b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return HTTP.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String cookie(HttpResponse<?> r, String name) {
        return r.headers().allValues("Set-Cookie").stream().filter(c -> c.startsWith(name + "=")).map(c -> c.split(";", 2)[0].substring(name.length() + 1)).findFirst().orElse(null);
    }

    private static String line(CapturedOutput out, String contains) {
        return out.getAll().lines().filter(l -> l.contains(contains)).reduce((a, b) -> a + "\n" + b).orElse("");
    }

    @Test
    void everyResponseCarriesARequestIdAndErrorBodiesRepeatIt() throws Exception {
        HttpResponse<String> r = send("GET", "/api/v1/me", null, null, null, null);
        String id = r.headers().firstValue("X-Request-Id").orElseThrow();
        assertThat(UUID.fromString(id)).isNotNull();
        assertThat(r.body()).contains("\"requestId\":\"" + id + "\"");
    }

    @Test
    void aSafeCallerSuppliedIdIsHonouredAndAnUnsafeOneIsReplaced(CapturedOutput out) throws Exception {
        String mine = "trace-" + UUID.randomUUID();
        assertThat(send("GET", "/api/v1/me", null, null, null, mine).headers().firstValue("X-Request-Id")).contains(mine);
        assertThat(line(out, "path=/api/v1/me")).contains("[" + mine + "]");
        String evil = send("GET", "/api/v1/me", null, null, null, "x y\\nforged").headers().firstValue("X-Request-Id").orElseThrow();
        assertThat(evil).doesNotContain("forged").hasSize(36);
    }

    @Test
    void theAccessLineShowsMethodPathStatusDurationAndNeverTheQueryString(CapturedOutput out) throws Exception {
        String id = "acc-" + UUID.randomUUID();
        send("GET", "/api/v1/me?secret=hunter2", null, null, null, id);
        String l = line(out, "[" + id + "]");
        assertThat(l).contains("http method=GET path=/api/v1/me status=401 durationMs=").contains("user=-").doesNotContain("hunter2");
    }

    @Test
    void registrationAndLoginAreAuditedWithUserIdAndNoSecrets(CapturedOutput out) throws Exception {
        String email = "trace" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String password = "super secret passphrase";
        HttpResponse<String> first = send("GET", "/api/v1/me", null, null, null, null);
        String csrf = cookie(first, "XSRF-TOKEN");
        String cookies = "XSRF-TOKEN=" + csrf;
        String rid = "reg-" + UUID.randomUUID();
        HttpResponse<String> reg = send("POST", "/api/v1/auth/register", "{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"displayName\":\"T\"}", cookies, csrf, rid);
        assertThat(reg.statusCode()).isEqualTo(201);
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(reg.body());
        assertThat(m.find()).isTrue();
        String userId = m.group(1);
        assertThat(line(out, "auth.register.created")).contains("userId=" + userId);
        assertThat(line(out, "[" + rid + "]")).contains("auth.");
        assertThat(line(out, "http method=POST path=/api/v1/auth/register").lines().reduce((a, b) -> b).orElse("")).contains("status=201").contains("user=" + userId);

        send("POST", "/api/v1/auth/login", "{\"email\":\"" + email + "\",\"password\":\"wrong wrong wrong\"}", cookies, csrf, null);
        assertThat(line(out, "auth.login.failed")).contains("reason=bad_password").contains("email=");
        send("POST", "/api/v1/auth/login", "{\"email\":\"nobody" + email + "\",\"password\":\"x\"}", cookies, csrf, null);
        assertThat(line(out, "auth.login.failed")).contains("reason=unknown_email");

        String all = out.getAll();
        assertThat(all).doesNotContain(password).doesNotContain("wrong wrong wrong").doesNotContain(email).doesNotContain(cookie(reg, "LIFEOS_SESSION"));
    }

    @Test
    void anAuthenticatedRequestLineAndItsMdcCarryTheUser(CapturedOutput out) throws Exception {
        String email = "mdc" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String csrf = cookie(send("GET", "/api/v1/me", null, null, null, null), "XSRF-TOKEN");
        HttpResponse<String> reg = send("POST", "/api/v1/auth/register", "{\"email\":\"" + email + "\",\"password\":\"another long password\",\"displayName\":\"T\"}", "XSRF-TOKEN=" + csrf, csrf, null);
        String cookies = "XSRF-TOKEN=" + cookie(reg, "XSRF-TOKEN") + "; LIFEOS_SESSION=" + cookie(reg, "LIFEOS_SESSION");
        String id = "me-" + UUID.randomUUID();
        assertThat(send("GET", "/api/v1/me", null, cookies, null, id).statusCode()).isEqualTo(200);
        assertThat(line(out, "[" + id + "]")).containsPattern("status=200").containsPattern("user=[0-9a-f-]{36}");
    }

    @Test
    void csrfRejectionsAndMalformedBodiesAreLoggedAsWarnings(CapturedOutput out) throws Exception {
        String id = "csrf-" + UUID.randomUUID();
        assertThat(send("POST", "/api/v1/auth/login", "{}", null, null, id).statusCode()).isEqualTo(403);
        assertThat(line(out, "[" + id + "]")).contains("WARN").contains("auth.csrf.rejected");
        String csrf = cookie(send("GET", "/api/v1/me", null, null, null, null), "XSRF-TOKEN");
        String bad = "bad-" + UUID.randomUUID();
        assertThat(send("POST", "/api/v1/auth/login", "{nope", "XSRF-TOKEN=" + csrf, csrf, bad).statusCode()).isEqualTo(400);
        assertThat(line(out, "[" + bad + "]")).contains("request.unreadable");
    }
}
