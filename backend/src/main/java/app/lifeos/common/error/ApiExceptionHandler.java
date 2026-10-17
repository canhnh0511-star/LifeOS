package app.lifeos.common.error;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Normalizes every failure to {@link ApiError}; never leaks exception text or stack traces. */
@RestControllerAdvice
class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> api(ApiException e) {
        log.info("request.rejected status={} code={} fields={}", e.status().value(), e.code(), e.fields().keySet());
        return ResponseEntity.status(e.status()).body(new ApiError(e.code(), e.getMessage(), e.fields()));
    }

    @ExceptionHandler(RateLimitedException.class)
    ResponseEntity<ApiError> rateLimited(RateLimitedException e) {
        log.info("request.rejected status=429 code=RATE_LIMITED retryAfterSeconds={}", e.retryAfterSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", String.valueOf(e.retryAfterSeconds()))
            .body(new ApiError(e.code(), e.getMessage(), e.fields()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        log.info("request.rejected status=422 code=VALIDATION_FAILED fields={}", fields.keySet()); // field names only, never submitted values
        return ResponseEntity.unprocessableEntity().body(new ApiError("VALIDATION_FAILED", "Dữ liệu không hợp lệ.", fields));
    }

    /** A query or path parameter of the wrong type (e.g. `days=abc`) is the caller's mistake: a field error, not a 500. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> badParameter(MethodArgumentTypeMismatchException e) {
        log.info("request.rejected status=422 code=VALIDATION_FAILED fields=[{}]", e.getName());
        return ResponseEntity.unprocessableEntity().body(new ApiError("VALIDATION_FAILED", "Dữ liệu không hợp lệ.", Map.of(e.getName(), "Giá trị không hợp lệ.")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException e) {
        log.warn("request.unreadable status=400 reason={}", e.getClass().getSimpleName());
        return ResponseEntity.badRequest().body(new ApiError("BAD_REQUEST", "Nội dung yêu cầu không đọc được.", Map.of()));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> method(HttpRequestMethodNotSupportedException e) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(new ApiError("METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.", Map.of()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> notFound(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("NOT_FOUND", "Không tìm thấy.", Map.of()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception e) {
        log.error("request.failed status=500 code=INTERNAL_ERROR", e);
        return ResponseEntity.internalServerError().body(new ApiError("INTERNAL_ERROR", "Đã có lỗi hệ thống. Vui lòng thử lại.", Map.of()));
    }
}
