package com.bookstore.userservices.security;

import com.bookstore.userservices.entity.User;
import io.jsonwebtoken.*;
import java.util.*;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    public static final String CLAIM_USER_ID = "userId";
    public static final String CLAIM_ROLES = "roles";
    public static final String CLAIM_TYPE = "type";
    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";
    private final JwtSigningKeys keys;
    private final String issuer;
    private final String audience;
    private final long jwtExpiration;
    private final long refreshExpiration;
    private final JwtParser parser;

    public JwtService(JwtSigningKeys keys,
            @Value("${application.security.jwt.issuer:http://localhost:8081}") String issuer,
            @Value("${application.security.jwt.audience:bookstore}") String audience,
            @Value("${application.security.jwt.expiration}") long jwtExpiration,
            @Value("${application.security.jwt.refresh-expiration}") long refreshExpiration) {
        if (issuer.isBlank() || audience.isBlank() || jwtExpiration <= 0 || refreshExpiration <= 0) {
            throw new IllegalArgumentException("JWT issuer, audience and positive token lifetimes are required");
        }
        this.keys = keys;
        this.issuer = issuer;
        this.audience = audience;
        this.jwtExpiration = jwtExpiration;
        this.refreshExpiration = refreshExpiration;
        parser = Jwts.parser().verifyWith(keys.publicKey()).requireIssuer(issuer).requireAudience(audience).build();
    }

    public String extractUsername(String token) {
        return extractClaim(token, claims -> claims.get("username", String.class));
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extractAllClaims(token));
    }

    public String generateToken(User user) { return buildToken(user, TOKEN_TYPE_ACCESS, jwtExpiration); }
    public String generateRefreshToken(User user) { return buildToken(user, TOKEN_TYPE_REFRESH, refreshExpiration); }

    public String generateToken(User user, String sessionId) {
        return buildToken(user, TOKEN_TYPE_ACCESS, sessionId, new Date(System.currentTimeMillis() + jwtExpiration));
    }

    public String generateRefreshToken(User user, String sessionId) {
        return buildToken(user, TOKEN_TYPE_REFRESH, sessionId, new Date(System.currentTimeMillis() + refreshExpiration));
    }

    public String generateRefreshToken(User user, String sessionId, java.time.Instant expiresAt) {
        return buildToken(user, TOKEN_TYPE_REFRESH, sessionId, Date.from(expiresAt));
    }

    private String buildToken(User user, String type, long expiration) {
        return buildToken(user, type, null, new Date(System.currentTimeMillis() + expiration));
    }

    private String buildToken(User user, String type, String sessionId, Date expiresAt) {
        if (user.getUserId() == null || user.getUserId() <= 0 || user.getUsername() == null || user.getUsername().isBlank()) {
            throw new IllegalArgumentException("A persisted user identity is required");
        }
        var builder = Jwts.builder().header().keyId(keys.keyId()).and()
                .issuer(issuer).audience().add(audience).and().subject(user.getUserId().toString())
                .id(UUID.randomUUID().toString()).issuedAt(new Date())
                .expiration(expiresAt)
                .claim(CLAIM_USER_ID, user.getUserId()).claim("username", user.getUsername()).claim(CLAIM_TYPE, type);
        if (TOKEN_TYPE_ACCESS.equals(type)) builder.claim(CLAIM_ROLES, List.of(user.getRole().getRoleName().name()));
        if (sessionId != null) builder.claim("sid", sessionId);
        return builder.signWith(keys.privateKey(), Jwts.SIG.RS256).compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        Claims claims = extractAllClaims(token);
        return userDetails instanceof CustomUserDetails details
                && claims.getSubject().equals(details.getUser().getUserId().toString())
                && claims.get("username", String.class).equals(userDetails.getUsername())
                && TOKEN_TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public boolean isRefreshTokenValid(String token, User user) {
        Claims claims = extractAllClaims(token);
        return claims.getSubject().equals(user.getUserId().toString())
                && claims.get("username", String.class).equals(user.getUsername())
                && TOKEN_TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public Date extractExpiration(String token) { return extractClaim(token, Claims::getExpiration); }
    public long getRemainingExpiration(String token) {
        return Math.max(0, extractExpiration(token).getTime() - System.currentTimeMillis());
    }

    private Claims extractAllClaims(String token) {
        var signed = parser.parseSignedClaims(token);
        Claims claims = signed.getPayload();
        Object id = claims.get(CLAIM_USER_ID);
        Object username = claims.get("username");
        Object type = claims.get(CLAIM_TYPE);
        boolean identityValid = id instanceof Number && username instanceof String name && !name.isBlank()
                && claims.getExpiration() != null && claims.getSubject() != null;
        try {
            identityValid = identityValid && new java.math.BigDecimal(id.toString()).longValueExact() > 0
                    && claims.getSubject().equals(Long.toString(new java.math.BigDecimal(id.toString()).longValueExact()));
        } catch (RuntimeException error) { identityValid = false; }
        boolean typeValid = TOKEN_TYPE_REFRESH.equals(type);
        if (TOKEN_TYPE_ACCESS.equals(type)) {
            Object roles = claims.get(CLAIM_ROLES);
            typeValid = roles instanceof List<?> list && !list.isEmpty()
                    && list.stream().allMatch(role -> role instanceof String && Set.of("ADMIN", "STAFF", "CUSTOMER").contains(role));
        }
        if (!identityValid || !typeValid || !"RS256".equals(signed.getHeader().getAlgorithm())
                || !keys.keyId().equals(signed.getHeader().getKeyId())) {
            throw new MalformedJwtException("Invalid JWT identity, type or key identifier");
        }
        return claims;
    }
}
