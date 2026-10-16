package app.lifeos.lifecycle.model;

public enum RecordStatus {
    ACTIVE, PAUSED, ARCHIVED;

    public static RecordStatus parse(Object value) {
        if (value instanceof String s) for (RecordStatus r : values()) if (r.name().equals(s)) return r;
        return null;
    }
}
