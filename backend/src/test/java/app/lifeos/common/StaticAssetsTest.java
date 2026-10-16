package app.lifeos.common;

import static org.assertj.core.api.Assertions.assertThat;

import app.lifeos.PostgresTestSupport;
import app.lifeos.support.TestBrowser;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StaticAssetsTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresTestSupport.register(r); }

    @LocalServerPort int port;

    @Test void theWebManifestIsServedWithItsOwnMediaType() throws Exception {
        var response = new TestBrowser(port).get("/manifest.webmanifest");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("content-type").orElse("")).startsWith("application/manifest+json");
    }
}
