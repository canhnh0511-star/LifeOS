package app.lifeos.analytics.service;

import app.lifeos.analytics.dto.AnalyticsDto;
import app.lifeos.analytics.dto.AnalyticsDto.CategoryStatDto;
import app.lifeos.analytics.dto.AnalyticsDto.DayStatDto;
import app.lifeos.analytics.dto.AnalyticsDto.PreviousPeriodDto;
import app.lifeos.common.time.UserClock;
import app.lifeos.goal.model.Category;
import app.lifeos.habit.model.Habit;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.journey.dto.JourneyDto;
import app.lifeos.journey.service.JourneyService;
import app.lifeos.ledger.repository.XpTransactionRepository;
import app.lifeos.quest.model.QuestInstance;
import app.lifeos.quest.repository.QuestInstanceRepository;
import app.lifeos.quest.service.ScheduleHistory;
import app.lifeos.quest.service.ScheduleHistoryLoader;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 7- and 30-day statistics ending today (user's local date), plus the same-length period before it.
 * "Scheduled" comes from the effective schedule history, so pausing or editing later never rewrites a past day.
 * Per DOMAIN_RULES a boss counts 1 scheduled on its bossDate and 1 completed on the day it was defeated.
 */
@Service
public class AnalyticsService {
    private final ScheduleHistoryLoader loader;
    private final QuestInstanceRepository instances;
    private final XpTransactionRepository ledger;
    private final JourneyService journeys;
    private final UserRepository users;
    private final UserClock clock;

    public AnalyticsService(ScheduleHistoryLoader loader, QuestInstanceRepository instances, XpTransactionRepository ledger, JourneyService journeys,
                            UserRepository users, UserClock clock) {
        this.loader = loader; this.instances = instances; this.ledger = ledger; this.journeys = journeys; this.users = users; this.clock = clock;
    }

    @Transactional
    public AnalyticsDto analytics(UUID userId, int length) {
        LocalDate today = clock.today(users.findById(userId).orElseThrow().getTimezone());
        ScheduleHistory history = loader.load(userId);
        JourneyDto journey = journeys.current(userId);
        Period current = period(userId, history, journey, today, length);
        Period previous = period(userId, history, journey, today.minusDays(length), length);
        return new AnalyticsDto(length == 7 ? "7d" : "30d", current.days, current.rate(), current.completed, current.scheduled, current.xp, current.categories(),
            new PreviousPeriodDto(previous.rate(), previous.completed, previous.scheduled, previous.xp, previous.categories()));
    }

    /** Per-area scheduled/completed over the `length` days ending on `end` (bosses included), without the previous period. */
    @Transactional
    public List<CategoryStatDto> categoriesEnding(UUID userId, LocalDate end, int length) {
        return period(userId, loader.load(userId), journeys.current(userId), end, length).categories();
    }

    private Period period(UUID userId, ScheduleHistory history, JourneyDto journey, LocalDate end, int length) {
        LocalDate start = end.minusDays(length - 1L);
        Map<String, QuestInstance> stored = new HashMap<>();
        for (QuestInstance q : instances.findByUserIdAndScheduledDateBetween(userId, start, end)) stored.put(q.getHabitId() + "|" + q.getScheduledDate(), q);
        Map<LocalDate, Integer> xpByDay = new HashMap<>();
        for (Object[] row : ledger.sumByDate(userId, start, end)) xpByDay.put((LocalDate) row[0], ((Long) row[1]).intValue());

        Period p = new Period();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            int scheduled = 0, completed = 0;
            for (Habit h : history.habits()) {
                if (!history.hasQuest(h, d)) continue;
                QuestInstance q = stored.get(h.getId() + "|" + d);
                Category category = q != null ? q.getCategory() : history.goalOf(h).getCategory();
                boolean done = q != null && q.getStatus() == QuestInstance.Status.COMPLETED;
                scheduled++; p.cat(category)[0]++;
                if (done) { completed++; p.cat(category)[1]++; }
            }
            for (var chapter : journey.chapters()) {
                var boss = chapter.boss();
                Category category = Category.valueOf(boss.category());
                if (boss.bossDate().equals(d)) { scheduled++; p.cat(category)[0]++; }
                if ("DEFEATED".equals(boss.status()) && d.equals(boss.defeatedDate())) { completed++; p.cat(category)[1]++; }
            }
            int xp = xpByDay.getOrDefault(d, 0);
            p.days.add(new DayStatDto(d, scheduled, completed, xp));
            p.scheduled += scheduled; p.completed += completed; p.xp += xp;
        }
        return p;
    }

    private static final class Period {
        final List<DayStatDto> days = new ArrayList<>();
        final Map<Category, int[]> byCategory = new EnumMap<>(Category.class);
        int scheduled, completed, xp;

        /** [scheduled, completed] */
        int[] cat(Category c) { return byCategory.computeIfAbsent(c, k -> new int[2]); }

        int rate() { return scheduled == 0 ? 0 : (int) Math.round(100.0 * completed / scheduled); }

        /** All five areas, always; scheduled = 0 means "no data" (not 0%). */
        List<CategoryStatDto> categories() {
            return java.util.Arrays.stream(Category.values()).map(c -> {
                int[] v = byCategory.getOrDefault(c, new int[2]);
                return new CategoryStatDto(c.name(), v[0], v[1]);
            }).toList();
        }
    }
}
