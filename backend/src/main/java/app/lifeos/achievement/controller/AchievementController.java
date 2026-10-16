package app.lifeos.achievement.controller;

import app.lifeos.achievement.dto.AchievementDto;
import app.lifeos.achievement.service.AchievementService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/achievements")
class AchievementController {
    private final AchievementService service;

    AchievementController(AchievementService service) { this.service = service; }

    @GetMapping
    List<AchievementDto> list(Authentication auth) { return service.list(UUID.fromString(auth.getName())); }
}
