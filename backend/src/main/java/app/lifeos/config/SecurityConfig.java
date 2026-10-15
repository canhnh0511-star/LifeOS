package app.lifeos.config;

import app.lifeos.common.error.ApiError;
import app.lifeos.common.logging.MdcUserFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);
    static final String CSRF_COOKIE = "XSRF-TOKEN";
    static final String CSRF_HEADER = "X-XSRF-TOKEN";

    /** Double-submit cookie: the SPA reads XSRF-TOKEN and echoes it in X-XSRF-TOKEN. The session cookie itself stays HttpOnly. */
    @Bean
    CsrfTokenRepository csrfTokenRepository(@org.springframework.beans.factory.annotation.Value("${server.servlet.session.cookie.secure:true}") boolean secure) {
        CookieCsrfTokenRepository repo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repo.setCookieName(CSRF_COOKIE);
        repo.setHeaderName(CSRF_HEADER);
        repo.setCookiePath("/");
        repo.setCookieCustomizer(c -> c.secure(secure).sameSite("Lax"));
        return repo;
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    SecurityFilterChain api(HttpSecurity http, CsrfTokenRepository csrfRepo) throws Exception {
        http
            .csrf(c -> c.csrfTokenRepository(csrfRepo).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .addFilterAfter(new MdcUserFilter(), SecurityContextHolderFilter.class)
            .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
            // An anonymous 401 must not allocate a server session (the default request cache would, to remember the URL).
            .requestCache(c -> c.requestCache(new org.springframework.security.web.savedrequest.NullRequestCache()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/logout").permitAll()
                .anyRequest().authenticated())
            .httpBasic(b -> b.disable())
            .formLogin(f -> f.disable())
            .logout(l -> l.disable())
            .headers(h -> h.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'")))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    log.debug("auth.unauthenticated method={} path={}", req.getMethod(), req.getRequestURI());
                    json(res, 401, ApiError.json("UNAUTHENTICATED", "Chưa đăng nhập hoặc phiên đã hết hạn."));
                })
                .accessDeniedHandler((req, res, ex) -> {
                    log.warn("auth.csrf.rejected method={} path={} reason={}", req.getMethod(), req.getRequestURI(), ex.getClass().getSimpleName());
                    json(res, 403, ApiError.json("CSRF_INVALID", "Yêu cầu bị từ chối. Tải lại trang và thử lại."));
                }))
            .cors(Customizer.withDefaults());
        return http.build();
    }

    private static void json(HttpServletResponse res, int status, String body) throws IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write(body);
    }

    /** Spring defers token creation; touching it makes every response (even a 401) carry the XSRF-TOKEN cookie. */
    static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest req, HttpServletResponse res, jakarta.servlet.FilterChain chain) throws IOException, jakarta.servlet.ServletException {
            CsrfToken token = (CsrfToken) req.getAttribute(CsrfToken.class.getName());
            if (token != null) token.getToken();
            chain.doFilter(req, res);
        }
    }
}
