package app.lifeos.common.error;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** A request failure with a stable contract `code` (docs/API_CONTRACT.md error table). */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fields;

    public ApiException(HttpStatus status, String code, String message, Map<String, String> fields) {
        super(message);
        this.status = status; this.code = code; this.fields = fields;
    }

    public ApiException(HttpStatus status, String code, String message) { this(status, code, message, Map.of()); }

    public HttpStatus status() { return status; }
    public String code() { return code; }
    public Map<String, String> fields() { return fields; }
}
