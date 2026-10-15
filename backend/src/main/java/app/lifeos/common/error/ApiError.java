package app.lifeos.common.error;

import java.util.Map;

/** Error body shared by every failure: `{code, message, fields}` (docs/API_CONTRACT.md). */
public record ApiError(String code, String message, Map<String, String> fields, String requestId) {
    public ApiError(String code, String message, Map<String, String> fields) { this(code, message, fields, org.slf4j.MDC.get("requestId")); }

    /** For filter-level responses that are written without a message converter. Inputs are constants without quotes. */
    public static String json(String code, String message) {
        String id = org.slf4j.MDC.get("requestId");
        return "{\"code\":\"" + code + "\",\"message\":\"" + message + "\",\"fields\":{}" + (id == null ? "" : ",\"requestId\":\"" + id + "\"") + "}";
    }
}
