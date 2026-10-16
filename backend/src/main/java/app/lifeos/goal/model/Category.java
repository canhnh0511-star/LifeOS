package app.lifeos.goal.model;

public enum Category {
    CAREER, CREATIVITY, HEALTH, KNOWLEDGE, MINDFULNESS;

    public static Category parse(Object value) {
        if (value instanceof String s) for (Category c : values()) if (c.name().equals(s)) return c;
        return null;
    }
}
