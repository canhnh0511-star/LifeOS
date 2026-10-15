package app.lifeos.identity;

/** Mirrors the contract's `User` schema (docs/openapi.yaml, frontend UserDto). */
public record UserDto(String id, String displayName, String email, String timezone) {
    static UserDto of(User u) {
        return new UserDto(u.getId().toString(), u.getDisplayName(), u.getEmail(), u.getTimezone());
    }
}
