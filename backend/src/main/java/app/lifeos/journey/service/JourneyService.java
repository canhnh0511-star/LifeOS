package app.lifeos.journey.service;

import app.lifeos.common.time.UserClock;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.journey.dto.JourneyDto;
import app.lifeos.journey.dto.JourneyDto.BadgeDto;
import app.lifeos.journey.dto.JourneyDto.BossDto;
import app.lifeos.journey.dto.JourneyDto.ChapterDto;
import app.lifeos.journey.model.Journey;
import app.lifeos.journey.repository.JourneyRepository;
import app.lifeos.progress.dto.ProgressDto;
import app.lifeos.progress.service.ProgressService;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import app.lifeos.quest.service.ScheduleHistory;
import app.lifeos.quest.service.ScheduleHistoryLoader;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The user's 66-day campaign. Timeline progress (elapsedDays / durationDays) and effort (completed / scheduled to date) are separate numbers.
 * Bosses are listed with LOCKED/AVAILABLE derived from area levels; DEFEATED needs the boss mutation endpoints, which do not exist yet.
 */
@Service
public class JourneyService {
    private static final Logger log = LoggerFactory.getLogger(JourneyService.class);
    private static final String TITLE = "The 66-Day Reset";
    private static final int DURATION_DAYS = 66;

    private final JourneyRepository journeys;
    private final UserRepository users;
    private final QuestInstanceRepository instances;
    private final ScheduleHistoryLoader loader;
    private final ProgressService progress;
    private final UserClock clock;

    public JourneyService(JourneyRepository journeys, UserRepository users, QuestInstanceRepository instances, ScheduleHistoryLoader loader,
                          ProgressService progress, UserClock clock) {
        this.journeys = journeys; this.users = users; this.instances = instances; this.loader = loader; this.progress = progress; this.clock = clock;
    }

    @Transactional
    public JourneyDto current(UUID userId) {
        User user = users.findById(userId).orElseThrow();
        Journey journey = journeys.findByUserId(userId).orElseGet(() -> create(user));
        LocalDate today = clock.today(user.getTimezone());
        LocalDate start = journey.getStartDate(), last = today.isAfter(journey.finalDate()) ? journey.finalDate() : today;
        int elapsed = (int) Math.max(0, Math.min(journey.getDurationDays(), ChronoUnit.DAYS.between(start, today) + 1));

        ScheduleHistory history = loader.load(userId);
        Set<String> done = new HashSet<>();
        for (QuestInstance q : instances.findByUserIdAndStatus(userId, QuestInstance.Status.COMPLETED)) done.add(q.getHabitId() + "|" + q.getScheduledDate());
        int scheduled = 0, completed = 0;
        for (LocalDate d = start; !d.isAfter(last); d = d.plusDays(1)) {
            for (var h : history.habits()) {
                if (!history.hasQuest(h, d)) continue;
                scheduled++;
                if (done.contains(h.getId() + "|" + d)) completed++;
            }
        }
        ProgressDto p = progress.progressFor(userId);
        List<ChapterDto> chapters = BossCatalog.CHAPTERS.stream().map(c -> chapter(c, start, p)).toList();
        String status = today.isAfter(journey.finalDate()) ? "COMPLETED" : "ACTIVE";
        return new JourneyDto(journey.getId().toString(), journey.getTitle(), start, journey.getDurationDays(), elapsed, scheduled, completed, status, chapters);
    }

    private Journey create(User user) {
        // The journey begins on the day the account was created, in the user's own timezone.
        LocalDate start = user.getCreatedAt().atZone(ZoneId.of(user.getTimezone())).toLocalDate();
        if (journeys.createIfAbsent(UUID.randomUUID(), user.getId(), TITLE, start, DURATION_DAYS, clock.now()) > 0) {
            log.info("journey.created userId={} startDate={} days={}", user.getId(), start, DURATION_DAYS);
        }
        return journeys.findByUserId(user.getId()).orElseThrow();
    }

    private static ChapterDto chapter(BossCatalog.Chapter c, LocalDate start, ProgressDto p) {
        BossCatalog.Boss b = BossCatalog.bossOf(c.index());
        LocalDate endDate = start.plusDays(c.toDay() - 1L);
        int areaLevel = p.areas().stream().filter(a -> a.category().equals(b.category())).findFirst().orElseThrow().level();
        String status = areaLevel >= b.requiredLevel() ? "AVAILABLE" : "LOCKED";
        BossDto boss = new BossDto("boss-" + b.code().toLowerCase().replace('_', '-'), b.code(), b.name(), b.category(), b.targetMinutes(), b.xpReward(),
            b.tier(), b.requiredLevel(), areaLevel, b.artKey(), endDate, status, null, null);
        return new ChapterDto(c.index(), c.title(), start.plusDays(c.fromDay() - 1L), endDate, boss, new BadgeDto("CHAPTER_" + c.index(), c.badgeName(), false));
    }
}
