package app.lifeos.quest.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** A quest's own copy of one checklist line, plus the progress made on that day. */
@Entity
@Table(name = "quest_objectives")
public class QuestObjective {
    @Id private UUID id;
    @Column(name = "quest_id", nullable = false, updatable = false) private UUID questId;
    @Column(nullable = false, updatable = false) private int position;
    @Column(nullable = false, updatable = false) private String title;
    @Column(nullable = false, updatable = false) private int target;
    @Column(nullable = false, updatable = false) private String unit;
    @Column(nullable = false, updatable = false) private int step;
    @Column(nullable = false) private int value;

    protected QuestObjective() {}

    public UUID getId() { return id; }
    public UUID getQuestId() { return questId; }
    public int getPosition() { return position; }
    public String getTitle() { return title; }
    public int getTarget() { return target; }
    public String getUnit() { return unit; }
    public int getStep() { return step; }
    public int getValue() { return value; }
    public boolean isMet() { return value >= target; }
    public void setValue(int value) { this.value = value; }
}
