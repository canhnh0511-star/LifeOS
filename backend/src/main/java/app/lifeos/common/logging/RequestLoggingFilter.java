package app.lifeos.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Outermost filter: gives every request a correlation id (echoed as `X-Request-Id` and in error bodies) and writes one
 * access line per request. Runs before Spring Security so rejected requests (401/403) are logged too.
 * Query strings, headers, cookies and bodies are never logged.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestLoggingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger("app.lifeos.http");
    static final String HEADER = "X-Request-Id";
    /** Only accept caller-supplied ids that are safe to put in logs (no CR/LF injection, bounded length). */
    private static final Pattern SAFE_ID = Pattern.compile("^[A-Za-z0-9._-]{8,64}$");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String supplied = req.getHeader(HEADER);
        String requestId = supplied != null && SAFE_ID.matcher(supplied).matches() ? supplied : UUID.randomUUID().toString();
        MDC.put(LogContext.REQUEST_ID, requestId);
        res.setHeader(HEADER, requestId);
        long start = System.nanoTime();
        try {
            chain.doFilter(req, res);
        } catch (ServletException | IOException | RuntimeException e) {
            log.error("http.failed method={} path={} durationMs={} user={}", req.getMethod(), req.getRequestURI(), millis(start), user(req), e);
            throw e;
        } finally {
            int status = res.getStatus();
            boolean health = req.getRequestURI().startsWith("/actuator/health");
            String line = "http method={} path={} status={} durationMs={} user={} ip={}";
            Object[] args = {req.getMethod(), req.getRequestURI(), status, millis(start), user(req), req.getRemoteAddr()};
            if (status >= 500) log.warn(line, args);
            else if (health) log.debug(line, args);
            else log.info(line, args);
            MDC.remove(LogContext.REQUEST_ID);
            MDC.remove(LogContext.USER_ID);
        }
    }

    private static long millis(long startNanos) { return (System.nanoTime() - startNanos) / 1_000_000; }

    private static String user(HttpServletRequest req) {
        Object id = req.getAttribute(LogContext.USER_ATTRIBUTE);
        return id == null ? "-" : id.toString();
    }
}
