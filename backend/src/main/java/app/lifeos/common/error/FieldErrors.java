package app.lifeos.common.error;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** Collects per-field validation messages and raises the contract's 422 VALIDATION_FAILED once. */
public final class FieldErrors {
    private final Map<String, String> fields = new LinkedHashMap<>();

    public FieldErrors add(String field, String message) { fields.putIfAbsent(field, message); return this; }
    public boolean has(String field) { return fields.containsKey(field); }

    public void throwIfAny() {
        if (!fields.isEmpty()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_FAILED", "Dữ liệu không hợp lệ.", Map.copyOf(fields));
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy " + what + ".");
    }
}
