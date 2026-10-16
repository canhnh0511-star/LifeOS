package app.lifeos.journey.controller;

import app.lifeos.journey.dto.BossMutationDto;
import app.lifeos.journey.service.BossService;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/bosses")
class BossController {
    private final BossService service;

    BossController(BossService service) { this.service = service; }

    @PutMapping("/{bossId}/completion")
    BossMutationDto defeat(Authentication auth, @PathVariable String bossId) { return service.defeat(UUID.fromString(auth.getName()), bossId); }

    @DeleteMapping("/{bossId}/completion")
    BossMutationDto undo(Authentication auth, @PathVariable String bossId) { return service.undo(UUID.fromString(auth.getName()), bossId); }
}
