package app.lifeos.habit.controller;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.habit.dto.CreateHabitRequest;
import app.lifeos.habit.dto.HabitDto;
import app.lifeos.habit.service.HabitService;
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
@RequestMapping("/api/v1/habits")
class HabitController {
    private final HabitService service;

    HabitController(HabitService service) { this.service = service; }

    @GetMapping
    List<HabitDto> list(Authentication auth) { return service.list(UUID.fromString(auth.getName())); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    HabitDto create(Authentication auth, @RequestBody CreateHabitRequest body) { return service.create(UUID.fromString(auth.getName()), body); }

    @PatchMapping("/{id}")
    HabitDto update(Authentication auth, @PathVariable String id, @RequestBody Map<String, Object> patch) {
        UUID habitId;
        try { habitId = UUID.fromString(id); } catch (IllegalArgumentException e) { throw FieldErrors.notFound("thói quen"); }
        return service.update(UUID.fromString(auth.getName()), habitId, patch);
    }
}
