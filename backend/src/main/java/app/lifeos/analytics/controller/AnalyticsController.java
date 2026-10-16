package app.lifeos.analytics.controller;

import app.lifeos.analytics.dto.AnalyticsDto;
import app.lifeos.analytics.service.AnalyticsService;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
class AnalyticsController {
    private final AnalyticsService service;

    AnalyticsController(AnalyticsService service) { this.service = service; }

    @GetMapping("/weekly")
    AnalyticsDto weekly(Authentication auth) { return service.analytics(UUID.fromString(auth.getName()), 7); }

    @GetMapping("/monthly")
    AnalyticsDto monthly(Authentication auth) { return service.analytics(UUID.fromString(auth.getName()), 30); }
}
