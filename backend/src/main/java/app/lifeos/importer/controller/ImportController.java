package app.lifeos.importer.controller;

import app.lifeos.importer.dto.ImportHabitPlanRequest;
import app.lifeos.importer.dto.ImportedHabitPlanDto;
import app.lifeos.importer.service.HabitPlanImportService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/imports")
class ImportController {
    private final HabitPlanImportService service;

    ImportController(HabitPlanImportService service) { this.service = service; }

    @PostMapping("/habit-plans")
    @ResponseStatus(HttpStatus.CREATED)
    ImportedHabitPlanDto importHabitPlan(Authentication auth, @RequestBody ImportHabitPlanRequest body) {
        return service.importPlan(UUID.fromString(auth.getName()), body);
    }
}
