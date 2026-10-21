package com.bookstore.userservices.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "auth_sessions", indexes = @Index(name = "ix_auth_session_expiry", columnList = "expires_at"))
@Getter @Setter @NoArgsConstructor
public class AuthSession {
    @Id
    @Column(name = "session_id", length = 36)
    private String id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "refresh_token_hash", nullable = false, length = 64)
    private String refreshTokenHash;
    @Column(nullable = false)
    private boolean revoked;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
