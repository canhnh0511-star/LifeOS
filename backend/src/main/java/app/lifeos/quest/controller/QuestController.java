package app.lifeos.quest.controller;

import app.lifeos.quest.dto.DailyDashboardDto;
import app.lifeos.quest.dto.QuestDto;
import app.lifeos.quest.dto.QuestMutationDto;
import app.lifeos.quest.service.QuestCompletionService;
import app.lifeos.quest.service.QuestService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class QuestController {
    private final QuestService service;

    private final QuestCompletionService completion;

    QuestController(QuestService service, QuestCompletionService completion) { this.service = service; this.completion = completion; }

    @PutMapping("/quests/{habitId}/dates/{date}/completion")
    QuestMutationDto complete(Authentication auth, @PathVariable String habitId, @PathVariable String date) {
        return completion.complete(UUID.fromString(auth.getName()), habitId, date);
    }

    @DeleteMapping("/quests/{habitId}/dates/{date}/completion")
    QuestMutationDto undo(Authentication auth, @PathVariable String habitId, @PathVariable String date) {
        return completion.undo(UUID.fromString(auth.getName()), habitId, date);
    }

    @PutMapping("/quests/{habitId}/dates/{date}/objectives/{objectiveId}")
    QuestMutationDto setObjective(Authentication auth, @PathVariable String habitId, @PathVariable String date, @PathVariable String objectiveId, @RequestBody ObjectiveProgressRequest body) {
        return completion.setObjective(UUID.fromString(auth.getName()), habitId, date, objectiveId, body.value());
    }

    /** `value` stays an Object so 1.5 or "x" is a field error (422) here instead of being coerced or rejected as unreadable JSON. */
    record ObjectiveProgressRequest(Object value) {}

    @GetMapping("/quests")
    List<QuestDto> quests(Authentication auth, @RequestParam(required = false) String date) {
        return service.quests(UUID.fromString(auth.getName()), date);
    }

    @GetMapping("/dashboard/today")
    DailyDashboardDto dashboard(Authentication auth, @RequestParam(required = false) String date) {
        return service.dashboard(UUID.fromString(auth.getName()), date);
    }
}
