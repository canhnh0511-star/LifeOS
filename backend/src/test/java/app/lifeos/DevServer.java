package app.lifeos;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.springframework.boot.SpringApplication;

/** Runs the real app against a throwaway embedded PostgreSQL (no Docker): `./mvnw spring-boot:test-run -Dspring-boot.run.main-class=app.lifeos.DevServer`. */
public final class DevServer {
    public static void main(String[] args) throws Exception {
        EmbeddedPostgres pg = EmbeddedPostgres.builder().start();
        System.setProperty("LIFEOS_DB_URL", pg.getJdbcUrl("postgres", "postgres"));
        System.setProperty("LIFEOS_DB_USER", "postgres");
        System.setProperty("LIFEOS_DB_PASSWORD", "postgres");
        System.setProperty("LIFEOS_COOKIE_SECURE", "false");
        SpringApplication.run(LifeOsApplication.class, args);
    }
}
