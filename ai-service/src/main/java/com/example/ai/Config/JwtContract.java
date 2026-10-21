package com.example.ai.Config;

public final class JwtContract {
    private JwtContract() {}
    public static org.springframework.security.oauth2.core.OAuth2TokenValidatorResult validateUser(
            org.springframework.security.oauth2.jwt.Jwt jwt, String audience) {
        try {
            Object roles = jwt.getClaims().get("roles");
            Object id = jwt.getClaims().get("userId");
            boolean valid = "access".equals(jwt.getClaims().get("type"))
                    && jwt.getExpiresAt() != null && jwt.getAudience().contains(audience)
                    && id instanceof Number
                    && roles instanceof java.util.List<?> list && !list.isEmpty()
                    && list.stream().allMatch(role -> role instanceof String
                            && java.util.Set.of("CUSTOMER", "STAFF", "ADMIN").contains(role));
            long userId = id instanceof Number ? new java.math.BigDecimal(id.toString()).longValueExact() : 0;
            valid = valid && userId > 0 && Long.toString(userId).equals(jwt.getSubject());
            return valid ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success() : invalid();
        } catch (RuntimeException error) { return invalid(); }
    }

    public static org.springframework.security.oauth2.core.OAuth2TokenValidatorResult invalid() {
        return org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                new org.springframework.security.oauth2.core.OAuth2Error("invalid_token", "Invalid token contract", null));
    }
}
