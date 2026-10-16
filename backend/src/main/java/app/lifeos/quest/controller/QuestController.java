package app.lifeos.quest.controller;

import app.lifeos.quest.dto.DailyDashboardDto;
import app.lifeos.quest.dto.QuestDto;
import app.lifeos.quest.service.QuestService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class QuestController {
    private final QuestService service;

    QuestController(QuestService service) { this.service = service; }

    @GetMapping("/quests")
    List<QuestDto> quests(Authentication auth, @RequestParam(required = false) String date) {
        return service.quests(UUID.fromString(auth.getName()), date);
    }

    @GetMapping("/dashboard/today")
    DailyDashboardDto dashboard(Authentication auth, @RequestParam(required = false) String date) {
        return service.dashboard(UUID.fromString(auth.getName()), date);
    }
}
