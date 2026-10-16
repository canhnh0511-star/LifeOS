package app.lifeos.goal.service;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.dto.CreateGoalRequest;
import app.lifeos.goal.dto.GoalDto;
import app.lifeos.goal.model.Category;
import app.lifeos.goal.model.Goal;
import app.lifeos.goal.repository.GoalRepository;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import app.lifeos.lifecycle.service.LifecycleService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoalService {
    private static final Logger log = LoggerFactory.getLogger(GoalService.class);
    private static final Set<String> PATCHABLE = Set.of("title", "description", "status");

    private final GoalRepository goals;
    private final UserRepository users;
    private final LifecycleService lifecycle;
    private final UserClock clock;

    public GoalService(GoalRepository goals, UserRepository users, LifecycleService lifecycle, UserClock clock) {
        this.goals = goals; this.users = users; this.lifecycle = lifecycle; this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<GoalDto> list(UUID userId) {
        return goals.findByUserIdOrderByCreatedAtAsc(userId).stream().map(GoalDto::of).toList();
    }

    @Transactional
    public GoalDto create(UUID userId, CreateGoalRequest req) {
        FieldErrors errors = new FieldErrors();
        checkTitle(errors, req.title(), "Tên mục tiêu");
        checkDescription(errors, req.description());
        Category category = Category.parse(req.category());
        if (category == null) errors.add("category", "Lĩnh vực không hợp lệ.");
        errors.throwIfAny();
        Goal goal = goals.save(new Goal(userId, category, req.title().trim(), req.description().trim(), clock.now()));
        log.info("goal.created userId={} goalId={} category={}", userId, goal.getId(), category);
        return GoalDto.of(goal);
    }

    /** Partial update. A status change is recorded as a lifecycle event that applies from the user's next local day. */
    @Transactional
    public GoalDto update(UUID userId, UUID goalId, Map<String, Object> patch) {
        PatchRules.requireKeys(patch, PATCHABLE);
        Goal goal = goals.findByIdAndUserId(goalId, userId).orElseThrow(() -> FieldErrors.notFound("mục tiêu"));
        FieldErrors errors = new FieldErrors();
        if (patch.containsKey("title")) checkTitle(errors, patch.get("title"), "Tên mục tiêu");
        if (patch.containsKey("description")) checkDescription(errors, patch.get("description"));
        RecordStatus status = null;
        if (patch.containsKey("status") && (status = RecordStatus.parse(patch.get("status"))) == null) errors.add("status", "Trạng thái không hợp lệ.");
        errors.throwIfAny();
        if (patch.containsKey("title")) goal.setTitle(((String) patch.get("title")).trim());
        if (patch.containsKey("description")) goal.setDescription(((String) patch.get("description")).trim());
        if (status != null && status != goal.getStatus()) {
            User user = users.findById(userId).orElseThrow();
            var effective = lifecycle.recordChange(user, LifecycleEvent.Subject.GOAL, goalId, status);
            log.info("goal.status_changed userId={} goalId={} from={} to={} effectiveDate={}", userId, goalId, goal.getStatus(), status, effective);
            goal.setStatus(status);
        }
        return GoalDto.of(goal);
    }

    private static void checkTitle(FieldErrors errors, Object value, String label) {
        if (!(value instanceof String s) || s.isBlank()) errors.add("title", label + " không được để trống.");
        else if (s.trim().length() > 150) errors.add("title", label + " tối đa 150 ký tự.");
    }

    private static void checkDescription(FieldErrors errors, Object value) {
        if (!(value instanceof String s) || s.trim().length() > 600) errors.add("description", "Mô tả tối đa 600 ký tự.");
    }
}
