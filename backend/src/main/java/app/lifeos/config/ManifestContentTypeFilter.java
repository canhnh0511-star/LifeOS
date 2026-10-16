package app.lifeos.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** The container serves *.webmanifest as application/octet-stream; installers expect application/manifest+json. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class ManifestContentTypeFilter extends OncePerRequestFilter {
    private static final String TYPE = "application/manifest+json";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) { return !request.getRequestURI().endsWith(".webmanifest"); }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        chain.doFilter(request, new HttpServletResponseWrapper(response) {
            @Override public void setContentType(String type) { super.setContentType(TYPE); }
            @Override public void setHeader(String name, String value) { super.setHeader(name, "Content-Type".equalsIgnoreCase(name) ? TYPE : value); }
            @Override public void addHeader(String name, String value) { super.addHeader(name, "Content-Type".equalsIgnoreCase(name) ? TYPE : value); }
        });
    }
}
