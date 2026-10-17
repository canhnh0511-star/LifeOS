package app.lifeos.workout;

import app.lifeos.common.error.FieldErrors;
import app.lifeos.common.time.UserClock;
import app.lifeos.identity.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only views over what the user really did (B-29, B-41; ADR-038): training badges and set statistics. Everything is
 * computed from completed sessions and the set log on every read, so there is nothing stored that could drift, no XP,
 * and undoing a session or deleting a set simply takes the evidence away.
 */
@Service
public class WorkoutInsightsService {
    public record Badge(String code, String name, String description, boolean earned, int progress, int target) {}
    public record DaySets(LocalDate date, int sets) {}
    public record ExerciseTotals(String exercise, int sets, int reps, BigDecimal volumeKg) {}
    public record Stats(LocalDate from, LocalDate to, int sessions, List<DaySets> days, List<ExerciseTotals> exercises) {}

    record Def(String code, String name, String description, int target, boolean bySets) {}
    static final List<Def> BADGES = List.of(
        new Def("BADGE_FIRST_WORKOUT", "Buổi tập đầu tiên", "Hoàn thành một buổi tập có danh sách bài.", 1, false),
        new Def("BADGE_10_SESSIONS", "Mười buổi tập", "Hoàn thành 10 buổi tập có danh sách bài.", 10, false),
        new Def("BADGE_100_SETS", "Trăm set", "Ghi lại 100 set trong nhật ký tập.", 100, true));
    static final int MAX_DAYS = 90;

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final UserClock clock;

    public WorkoutInsightsService(JdbcTemplate jdbc, UserRepository users, UserClock clock) { this.jdbc = jdbc; this.users = users; this.clock = clock; }

    @Transactional(readOnly = true)
    public List<Badge> badges(UUID userId) {
        int sessions = count("SELECT count(*) FROM quest_instances q WHERE q.user_id = ? AND q.status = 'COMPLETED' AND EXISTS (SELECT 1 FROM quest_objectives o WHERE o.quest_id = q.id)", userId);
        int sets = count("SELECT count(*) FROM workout_sets WHERE user_id = ?", userId);
        List<Badge> out = new ArrayList<>();
        for (Def d : BADGES) {
            int have = d.bySets() ? sets : sessions;
            out.add(new Badge(d.code(), d.name(), d.description(), have >= d.target(), Math.min(have, d.target()), d.target()));
        }
        return out;
    }

    /** The last `days` days up to today in the user's timezone: sets per day, sessions (days x habits with a set) and totals per exercise. */
    @Transactional(readOnly = true)
    public Stats stats(UUID userId, int days) {
        if (days < 1 || days > MAX_DAYS) new FieldErrors().add("days", "Số ngày phải từ 1 đến " + MAX_DAYS + ".").throwIfAny();
        LocalDate to = clock.today(users.findById(userId).orElseThrow().getTimezone()), from = to.minusDays(days - 1L);
        java.sql.Date f = java.sql.Date.valueOf(from), t = java.sql.Date.valueOf(to);
        List<DaySets> perDay = new ArrayList<>();
        java.util.Map<LocalDate, Integer> counts = new java.util.HashMap<>();
        jdbc.query("SELECT entry_date, count(*) FROM workout_sets WHERE user_id = ? AND entry_date BETWEEN ? AND ? GROUP BY entry_date", rs -> { counts.put(rs.getDate(1).toLocalDate(), rs.getInt(2)); }, userId, f, t);
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) perDay.add(new DaySets(d, counts.getOrDefault(d, 0)));
        int sessions = count("SELECT count(*) FROM (SELECT DISTINCT habit_id, entry_date FROM workout_sets WHERE user_id = ? AND entry_date BETWEEN ? AND ?) x", userId, f, t);
        List<ExerciseTotals> exercises = jdbc.query("""
            SELECT min(exercise), count(*), coalesce(sum(reps), 0), coalesce(sum(reps * weight_kg), 0)
            FROM workout_sets WHERE user_id = ? AND entry_date BETWEEN ? AND ? GROUP BY lower(exercise) ORDER BY 4 DESC, 2 DESC, 1
            """, (rs, i) -> new ExerciseTotals(rs.getString(1), rs.getInt(2), rs.getInt(3), rs.getBigDecimal(4).setScale(2, java.math.RoundingMode.HALF_UP)), userId, f, t);
        return new Stats(from, to, sessions, perDay, exercises);
    }

    private int count(String sql, Object... args) { Integer n = jdbc.queryForObject(sql, Integer.class, args); return n == null ? 0 : n; }
}
