package app.lifeos.goal.service;

import app.lifeos.common.error.FieldErrors;
import java.util.Map;
import java.util.Set;

/** Shared rule for PATCH bodies: non-empty and only known fields (contract: VALIDATION_FAILED on `patch`). */
public final class PatchRules {
    private PatchRules() {}

    public static void requireKeys(Map<String, Object> patch, Set<String> allowed) {
        if (patch.isEmpty() || !allowed.containsAll(patch.keySet())) {
            new FieldErrors().add("patch", "Chỉ được cập nhật: " + String.join(", ", allowed.stream().sorted().toList()) + ".").throwIfAny();
        }
    }
}
