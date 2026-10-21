-- PostgreSQL UserServices database. Stop old UserServices instances before applying.
-- This module has no automatic migration runner.
BEGIN;
CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    refresh_token_hash VARCHAR(64) NOT NULL,
    revoked BOOLEAN NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_auth_session_expiry ON auth_sessions (expires_at);
COMMIT;
