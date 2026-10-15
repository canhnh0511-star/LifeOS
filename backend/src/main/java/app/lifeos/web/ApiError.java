package app.lifeos.web;

import java.util.Map;

/** Error body shared by every failure: `{code, message, fields}` (docs/API_CONTRACT.md). */
public record ApiError(String code, String message, Map<String, String> fields) {
    /** For filter-level responses that are written without a message converter. Inputs are constants without quotes. */
    public static String json(String code, String message) {
        return "{\"code\":\"" + code + "\",\"message\":\"" + message + "\",\"fields\":{}}";
    }
}
