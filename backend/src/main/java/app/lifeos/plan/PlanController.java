package app.lifeos.plan;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plan")
class PlanController {
    private final PlanService service;

    PlanController(PlanService service) { this.service = service; }

    @GetMapping
    TrainingPlanDto get(Authentication auth) { return service.current(UUID.fromString(auth.getName())); }

    @PostMapping
    ResponseEntity<TrainingPlanDto> start(Authentication auth, @RequestBody StartPlanRequest body) {
        PlanService.Started r = service.start(UUID.fromString(auth.getName()), body.startDate());
        return ResponseEntity.status(r.created() ? HttpStatus.CREATED : HttpStatus.OK).body(r.plan());
    }

    /** Adds the walks and stretching to a plan started before they existed (ADR-045). */
    @PostMapping("/recovery")
    TrainingPlanDto addRecovery(Authentication auth, @RequestBody StartPlanRequest body) { return service.addRecovery(UUID.fromString(auth.getName()), body.startDate()); }
}
