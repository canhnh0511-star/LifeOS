package app.lifeos.goal.controller;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.goal.dto.CreateGoalRequest;
import app.lifeos.goal.dto.GoalDto;
import app.lifeos.goal.service.GoalService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/goals")
class GoalController {
    private final GoalService service;

    GoalController(GoalService service) { this.service = service; }

    @GetMapping
    List<GoalDto> list(Authentication auth) { return service.list(UUID.fromString(auth.getName())); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    GoalDto create(Authentication auth, @RequestBody CreateGoalRequest body) { return service.create(UUID.fromString(auth.getName()), body); }

    @PatchMapping("/{id}")
    GoalDto update(Authentication auth, @PathVariable String id, @RequestBody Map<String, Object> patch) {
        return service.update(UUID.fromString(auth.getName()), parse(id), patch);
    }

    /** A malformed id cannot belong to anyone, so it is a plain 404 like any other unknown id. */
    static UUID parse(String id) {
        try { return UUID.fromString(id); } catch (IllegalArgumentException e) { throw FieldErrors.notFound("mục tiêu"); }
    }
}
