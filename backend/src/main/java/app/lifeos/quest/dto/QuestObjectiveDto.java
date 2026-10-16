package app.lifeos.quest.dto;

import app.lifeos.habit.model.HabitObjective;
import app.lifeos.quest.model.QuestObjective;

/** Mirrors the contract's `QuestObjective`: a checklist line with the progress made on this day. */
public record QuestObjectiveDto(String id, String title, int target, String unit, int step, int value) {
    public static QuestObjectiveDto of(QuestObjective o) { return new QuestObjectiveDto(o.getId().toString(), o.getTitle(), o.getTarget(), o.getUnit(), o.getStep(), o.getValue()); }

    /** A future day is only previewed from the habit's current checklist (nothing is stored), so progress is 0. */
    public static QuestObjectiveDto preview(HabitObjective o) { return new QuestObjectiveDto(o.getId().toString(), o.getTitle(), o.getTarget(), o.getUnit(), o.getStep(), 0); }
}
