package app.lifeos.lifecycle.service;

import app.lifeos.common.time.UserClock;
import app.lifeos.identity.model.User;
import app.lifeos.lifecycle.model.LifecycleEvent;
import app.lifeos.lifecycle.model.RecordStatus;
import app.lifeos.lifecycle.repository.LifecycleEventRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LifecycleService {
    private final LifecycleEventRepository events;
    private final UserClock clock;

    public LifecycleService(LifecycleEventRepository events, UserClock clock) { this.events = events; this.clock = clock; }

    /** Records a status change that takes effect on the user's next local day. Returns the effective date. */
    public LocalDate recordChange(User user, LifecycleEvent.Subject type, UUID subjectId, RecordStatus status) {
        LocalDate effective = clock.today(user.getTimezone()).plusDays(1);
        events.save(new LifecycleEvent(user.getId(), type, subjectId, effective, status, clock.now()));
        return effective;
    }
}
