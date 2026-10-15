package app.lifeos;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * One real PostgreSQL per test JVM. Uses Testcontainers when Docker is available (CI, owner machines);
 * otherwise falls back to a real embedded Postgres binary so tests still run without Docker.
 */
public final class PostgresTestSupport {
    private static PostgreSQLContainer container;
    private static EmbeddedPostgres embedded;

    private PostgresTestSupport() {}

    public static synchronized void register(DynamicPropertyRegistry registry) {
        try {
            String url, user, password;
            if (container == null && embedded == null) {
                if (dockerAvailable()) {
                    container = new PostgreSQLContainer("postgres:16-alpine");
                    container.start();
                } else {
                    embedded = EmbeddedPostgres.builder().start();
                }
            }
            if (container != null) {
                url = container.getJdbcUrl(); user = container.getUsername(); password = container.getPassword();
            } else {
                url = embedded.getJdbcUrl("postgres", "postgres"); user = "postgres"; password = "postgres";
            }
            registry.add("spring.datasource.url", () -> url);
            registry.add("spring.datasource.username", () -> user);
            registry.add("spring.datasource.password", () -> password);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot start test PostgreSQL", e);
        }
    }

    private static boolean dockerAvailable() {
        try { return DockerClientFactory.instance().isDockerAvailable(); } catch (Throwable t) { return false; }
    }
}
