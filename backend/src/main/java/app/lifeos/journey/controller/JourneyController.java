package app.lifeos.journey.controller;

import app.lifeos.journey.dto.JourneyDto;
import app.lifeos.journey.service.JourneyService;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/journeys")
class JourneyController {
    private final JourneyService service;

    JourneyController(JourneyService service) { this.service = service; }

    @GetMapping("/current")
    JourneyDto current(Authentication auth) { return service.current(UUID.fromString(auth.getName())); }
}
