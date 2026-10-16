package app.lifeos.importer.dto;

import app.lifeos.goal.dto.GoalDto;
import app.lifeos.habit.dto.HabitDto;
import java.util.List;

/** Mirrors the contract's `ImportedHabitPlan` schema. */
public record ImportedHabitPlanDto(List<GoalDto> goals, List<HabitDto> habits) {}
