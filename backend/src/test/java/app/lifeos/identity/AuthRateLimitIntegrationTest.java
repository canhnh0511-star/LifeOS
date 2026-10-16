package app.lifeos.identity;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "lifeos.auth.rate-limit.login-per-ip=8", "lifeos.auth.rate-limit.login-per-email=3", "lifeos.auth.rate-limit.login-window=15m",
    "lifeos.auth.rate-limit.register-per-ip=2", "lifeos.auth.rate-limit.register-per-email=2", "lifeos.auth.rate-limit.register-window=1h"})
class AuthRateLimitIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    static final class MutableClock extends Clock {
        volatile Instant now = Instant.now();
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId z) { return this; }
        public Instant instant() { return now; }
    }

    @TestConfiguration
    static class Config {
        @Bean @Primary MutableClock testClock() { return new MutableClock(); }
    }

    @LocalServerPort int port;
    @Autowired MutableClock clock;

    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final String PASSWORD = "correct horse battery";

    /** One anonymous visitor identified to the server by a spoofed-but-trusted single-hop X-Forwarded-For. */
    private HttpResponse<String> post(String path, String body, String ip, String csrf) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json").header("X-Forwarded-For", ip)
            .header("Cookie", "XSRF-TOKEN=" + csrf).header("X-XSRF-TOKEN", csrf);
        return HTTP.send(b.POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String login(String email, String password) { return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"; }
    private static String email() { return "u" + UUID.randomUUID().toString().substring(0, 8) + "@example.com"; }

    private void register(String email, String ip) throws Exception {
        assertThat(post("/api/v1/auth/register", "{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"displayName\":\"T\"}", ip, "t").statusCode()).isEqualTo(201);
    }

    @Test void knownAndUnknownEmailsAreLimitedIdentically() throws Exception {
        String known = email(), unknown = email();
        register(known, "203.0.0.1");
        for (String target : new String[] {known, unknown}) {
            for (int i = 0; i < 3; i++) assertThat(post("/api/v1/auth/login", login(target, "wrong-password-1"), "203.0.1." + (target.equals(known) ? 1 : 2), "t").statusCode()).isEqualTo(401);
        }
        HttpResponse<String> a = post("/api/v1/auth/login", login(known, "wrong-password-1"), "203.0.1.1", "t");
        HttpResponse<String> b = post("/api/v1/auth/login", login(unknown, "wrong-password-1"), "203.0.1.2", "t");
        assertThat(a.statusCode()).isEqualTo(429);
        assertThat(b.statusCode()).isEqualTo(429);
        assertThat(a.body().replaceAll(",\"requestId\":\"[^\"]*\"", "")).isEqualTo(b.body().replaceAll(",\"requestId\":\"[^\"]*\"", ""));
        assertThat(a.body()).contains("\"code\":\"RATE_LIMITED\"");
        assertThat(Long.parseLong(a.headers().firstValue("Retry-After").orElseThrow())).isBetween(1L, 900L);
    }

    @Test void correctPasswordIsAlsoBlockedWhileLockedThenRecoversAfterTheWindow() throws Exception {
        String e = email();
        register(e, "203.0.0.2");
        for (int i = 0; i < 3; i++) post("/api/v1/auth/login", login(e, "wrong-password-1"), "203.0.2.1", "t");
        assertThat(post("/api/v1/auth/login", login(e, PASSWORD), "203.0.2.1", "t").statusCode()).isEqualTo(429);
        assertThat(post("/api/v1/auth/login", login(e, PASSWORD), "203.0.2.99", "t").statusCode()).isEqualTo(429); // the account is locked from any address
        clock.now = clock.now.plus(Duration.ofMinutes(16));
        assertThat(post("/api/v1/auth/login", login(e, PASSWORD), "203.0.2.1", "t").statusCode()).isEqualTo(200);
    }

    @Test void anotherIpIsNotAffected() throws Exception {
        for (int i = 0; i < 8; i++) post("/api/v1/auth/login", login(email(), "wrong-password-1"), "203.0.3.1", "t");
        assertThat(post("/api/v1/auth/login", login(email(), "wrong-password-1"), "203.0.3.1", "t").statusCode()).isEqualTo(429);
        assertThat(post("/api/v1/auth/login", login(email(), "wrong-password-1"), "203.0.3.2", "t").statusCode()).isEqualTo(401);
    }

    @Test void registrationIsLimitedPerIp() throws Exception {
        register(email(), "203.0.4.1");
        register(email(), "203.0.4.1");
        HttpResponse<String> r = post("/api/v1/auth/register", "{\"email\":\"" + email() + "\",\"password\":\"" + PASSWORD + "\",\"displayName\":\"T\"}", "203.0.4.1", "t");
        assertThat(r.statusCode()).isEqualTo(429);
        assertThat(r.headers().firstValue("Retry-After")).isPresent();
    }

    @Test void spoofedLeftmostForwardedForDoesNotEscapeTheLimit() throws Exception {
        for (int i = 0; i < 8; i++) post("/api/v1/auth/login", login(email(), "wrong-password-1"), "198.51.100." + i + ", 203.0.5.1", "t");
        assertThat(post("/api/v1/auth/login", login(email(), "wrong-password-1"), "198.51.100.99, 203.0.5.1", "t").statusCode()).isEqualTo(429);
    }
}
