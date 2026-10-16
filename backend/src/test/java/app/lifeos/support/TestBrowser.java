package app.lifeos.support;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A minimal browser for integration tests: keeps cookies by hand (Secure cookies over plain http) and echoes XSRF-TOKEN like the SPA. */
public final class TestBrowser {
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private final int port;
    public final Map<String, String> jar = new LinkedHashMap<>();
    public List<String> lastSetCookies = List.of();

    public TestBrowser(int port) { this.port = port; }

    public HttpResponse<String> send(String method, String path, String body, boolean withCsrf) throws Exception {
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
            if (c.toLowerCase().contains("max-age=0") || value.isEmpty()) jar.remove(name); else jar.put(name, value);
        }
        return r;
    }

    public HttpResponse<String> get(String path) throws Exception { return send("GET", path, null, true); }
    public HttpResponse<String> post(String path, String body) throws Exception { return send("POST", path, body, true); }
    public HttpResponse<String> patch(String path, String body) throws Exception { return send("PATCH", path, body, true); }

    /** Registers a fresh account and leaves this browser signed in. */
    public String signUp() throws Exception {
        String email = "u" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        get("/api/v1/me"); // receives the CSRF cookie
        HttpResponse<String> r = post("/api/v1/auth/register", "{\"email\":\"" + email + "\",\"password\":\"correct horse battery\",\"displayName\":\"T\"}");
        if (r.statusCode() != 201) throw new IllegalStateException("register failed: " + r.statusCode() + " " + r.body());
        return email;
    }

    public static String idOf(String json) {
        Matcher m = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"").matcher(json);
        if (!m.find()) throw new IllegalStateException("no id in " + json);
        return m.group(1);
    }
}
