package app.lifeos.progress;

import app.lifeos.progress.dto.ProgressDto;
import app.lifeos.progress.service.ProgressService;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/progress")
class ProgressController {
    private final ProgressService service;

    ProgressController(ProgressService service) { this.service = service; }

    @GetMapping
    ProgressDto progress(Authentication auth) { return service.progressFor(UUID.fromString(auth.getName())); }
}
