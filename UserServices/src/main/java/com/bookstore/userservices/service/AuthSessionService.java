package com.bookstore.userservices.service;

import com.bookstore.userservices.entity.AuthSession;
import com.bookstore.userservices.entity.User;
import com.bookstore.userservices.entity.UserStatus;
import com.bookstore.userservices.exception.AppException;
import com.bookstore.userservices.exception.RefreshTokenReuseException;
import com.bookstore.userservices.repository.AuthSessionRepository;
import com.bookstore.userservices.repository.UserRepository;
import com.bookstore.userservices.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthSessionService {
    private final AuthSessionRepository sessions;
    private final UserRepository users;
    private final JwtService jwt;

    public record Tokens(User user, String accessToken, String refreshToken) {}

    @Transactional
    public Tokens create(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) throw inactiveAccount();
        String sessionId = UUID.randomUUID().toString();
        String refresh = jwt.generateRefreshToken(user, sessionId);
        AuthSession session = new AuthSession();
        session.setId(sessionId);
        session.setUserId(user.getUserId());
        session.setRefreshTokenHash(hash(refresh));
        session.setExpiresAt(jwt.extractExpiration(refresh).toInstant());
        sessions.save(session);
        return new Tokens(user, jwt.generateToken(user, sessionId), refresh);
    }

    @Transactional(noRollbackFor = RefreshTokenReuseException.class)
    public Tokens rotate(String token) {
        Claims claims = verifiedClaims(token, JwtService.TOKEN_TYPE_REFRESH);
        AuthSession session = lockSession(claims);
        if (session.isRevoked() || !session.getExpiresAt().isAfter(Instant.now())) throw invalidSession();
        User user = users.findById(session.getUserId()).orElseThrow(AuthSessionService::invalidSession);
        if (!jwt.isRefreshTokenValid(token, user)) throw invalidSession();
        if (!MessageDigest.isEqual(HexFormat.of().parseHex(session.getRefreshTokenHash()),
                HexFormat.of().parseHex(hash(token)))) {
            session.setRevoked(true);
            throw new RefreshTokenReuseException();
        }
        if (user.getStatus() != UserStatus.ACTIVE) throw inactiveAccount();
        String refresh = jwt.generateRefreshToken(user, session.getId(), session.getExpiresAt());
        String access = jwt.generateToken(user, session.getId());
        session.setRefreshTokenHash(hash(refresh));
        return new Tokens(user, access, refresh);
    }

    @Transactional
    public long revokeAccessSession(String token) {
        Claims claims = verifiedClaims(token, JwtService.TOKEN_TYPE_ACCESS);
        AuthSession session = lockSession(claims);
        session.setRevoked(true);
        return Math.max(0, claims.getExpiration().getTime() - System.currentTimeMillis());
    }

    @Transactional(readOnly = true)
    public boolean isAccessSessionActive(String token, Long userId) {
        Claims claims;
        try {
            claims = verifiedClaims(token, JwtService.TOKEN_TYPE_ACCESS);
        } catch (AppException invalid) {
            return false;
        }
        String id = claims.get("sid", String.class);
        if (id == null || userId == null || !userId.toString().equals(claims.getSubject())) return false;
        return sessions.findById(id).filter(session -> session.getUserId().equals(userId)
                && !session.isRevoked() && session.getExpiresAt().isAfter(Instant.now())).isPresent();
    }

    private AuthSession lockSession(Claims claims) {
        String id = claims.get("sid", String.class);
        if (id == null) throw invalidSession();
        AuthSession session = sessions.findByIdForUpdate(id).orElseThrow(AuthSessionService::invalidSession);
        if (!session.getUserId().toString().equals(claims.getSubject())) throw invalidSession();
        return session;
    }

    private Claims verifiedClaims(String token, String type) {
        try {
            Claims claims = jwt.extractClaim(token, value -> value);
            if (!type.equals(claims.get(JwtService.CLAIM_TYPE, String.class))
                    || claims.getId() == null || claims.getId().isBlank()) throw invalidSession();
            return claims;
        } catch (JwtException | IllegalArgumentException invalid) {
            throw invalidSession();
        }
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IllegalStateException("SHA-256 is required", unavailable);
        }
    }

    private static AppException invalidSession() {
        return new AppException("Token hoặc phiên không hợp lệ; vui lòng đăng nhập lại", HttpStatus.UNAUTHORIZED);
    }
    private static AppException inactiveAccount() {
        return new AppException("Tài khoản không còn hoạt động", HttpStatus.FORBIDDEN);
    }
}
