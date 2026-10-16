package app.lifeos.identity.controller;

import app.lifeos.common.error.ApiException;
import app.lifeos.identity.dto.AuthRequests;
import app.lifeos.identity.dto.UserDto;
import app.lifeos.identity.model.User;
import app.lifeos.identity.repository.UserRepository;
import app.lifeos.identity.service.AuthService;
import app.lifeos.common.logging.LogContext;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final AuthService auth;
    private final UserRepository users;
    private final CsrfTokenRepository csrf;
    private final SecurityContextRepository contexts = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    AuthController(AuthService auth, UserRepository users, CsrfTokenRepository csrf) {
        this.auth = auth; this.users = users; this.csrf = csrf;
    }

    @PostMapping("/auth/register")
    ResponseEntity<UserDto> register(@Valid @RequestBody AuthRequests.Register body, HttpServletRequest req, HttpServletResponse res) {
        User user = auth.register(body, req.getRemoteAddr());
        signIn(user, req, res);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserDto.of(user));
    }

    @PostMapping("/auth/login")
    UserDto login(@Valid @RequestBody AuthRequests.Login body, HttpServletRequest req, HttpServletResponse res) {
        User user = auth.authenticate(body, req.getRemoteAddr());
        signIn(user, req, res);
        return UserDto.of(user);
    }

    @PostMapping("/auth/logout")
    ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse res) {
        var session = req.getSession(false);
        log.info("auth.logout hadSession={}", session != null);
        if (session != null) session.invalidate();
        holder.clearContext();
        csrf.saveToken(null, req, res); // expire the CSRF cookie too
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    UserDto me(Authentication authentication) {
        UUID id = UUID.fromString(authentication.getName());
        // The account may have been deleted since the session was created.
        return users.findById(id).map(UserDto::of)
            .orElseThrow(() -> { log.warn("auth.session.orphaned userId={}", id); return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn."); });
    }

    private void signIn(User user, HttpServletRequest req, HttpServletResponse res) {
        // New session id on every sign-in defeats session fixation; the CSRF token is rotated with it.
        if (req.getSession(false) != null) req.changeSessionId();
        Authentication token = UsernamePasswordAuthenticationToken.authenticated(user.getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = holder.createEmptyContext();
        context.setAuthentication(token);
        holder.setContext(context);
        contexts.saveContext(context, req, res);
        csrf.saveToken(csrf.generateToken(req), req, res);
        LogContext.user(req, user.getId().toString());
        log.info("auth.signed_in userId={}", user.getId());
    }
}
