package app.lifeos.workout;

import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class WorkoutInsightsController {
    private final WorkoutInsightsService service;

    WorkoutInsightsController(WorkoutInsightsService service) { this.service = service; }

    @GetMapping("/badges")
    List<WorkoutInsightsService.Badge> badges(Authentication auth) { return service.badges(UUID.fromString(auth.getName())); }

    @GetMapping("/workout-stats")
    WorkoutInsightsService.Stats stats(Authentication auth, @RequestParam(defaultValue = "7") int days) { return service.stats(UUID.fromString(auth.getName()), days); }
}
