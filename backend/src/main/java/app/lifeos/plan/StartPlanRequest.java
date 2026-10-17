package app.lifeos.plan;

/** Body of POST /plan: the first day of the plan, like the plan import's `startDate`. */
public record StartPlanRequest(String startDate) {}
