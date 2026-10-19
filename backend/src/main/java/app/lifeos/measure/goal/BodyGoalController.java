package app.lifeos.measure.goal;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/body-goal")
class BodyGoalController {
    private final BodyGoalService service;

    BodyGoalController(BodyGoalService service) { this.service = service; }

    record GoalRequest(Object heightCm, Object startWeightKg, Object targetWeightKg, Object startDate, Object days) {}

    @GetMapping
    BodyGoalService.Goal get(Authentication auth) { return service.get(UUID.fromString(auth.getName())); }

    @PutMapping
    BodyGoalService.Goal put(Authentication auth, @RequestBody GoalRequest b) { return service.save(UUID.fromString(auth.getName()), b.heightCm(), b.startWeightKg(), b.targetWeightKg(), b.startDate(), b.days()); }
}
