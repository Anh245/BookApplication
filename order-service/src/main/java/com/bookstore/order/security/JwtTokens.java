package com.bookstore.order.security;

import java.math.BigDecimal;
import java.util.Base64;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public final class JwtTokens {
    private JwtTokens() {}

    public static SecretKey key(String encoded) {
        byte[] bytes = Base64.getDecoder().decode(encoded);
        if (bytes.length < 32) throw new IllegalArgumentException("JWT key must contain at least 32 bytes");
        String algorithm = bytes.length >= 64 ? "HmacSHA512" : bytes.length >= 48 ? "HmacSHA384" : "HmacSHA256";
        return new SecretKeySpec(bytes, algorithm);
    }

    public static NimbusJwtDecoder decoder(SecretKey key, OAuth2TokenValidator<Jwt> validator) {
        MacAlgorithm algorithm = switch (key.getAlgorithm()) {
            case "HmacSHA512" -> MacAlgorithm.HS512;
            case "HmacSHA384" -> MacAlgorithm.HS384;
            default -> MacAlgorithm.HS256;
        };
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(algorithm).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), validator));
        return decoder;
    }

    public static NimbusJwtDecoder userDecoder(String jwks, String issuer, String audience) {
        var decoder = NimbusJwtDecoder.withJwkSetUri(jwks)
                .jwsAlgorithm(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer), jwt -> validateUser(jwt, audience)));
        return decoder;
    }

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

    public static long userId(Jwt jwt) {
        Object value = jwt.getClaims().get("userId");
        if (!(value instanceof Number)) throw new IllegalArgumentException("Missing numeric userId");
        return new BigDecimal(value.toString()).longValueExact();
    }

    public static JwtAuthenticationConverter userConverter() {
        var converter = new JwtAuthenticationConverter();
        // Only the roles array grants user authorities; service scopes are ignored here.
        converter.setJwtGrantedAuthoritiesConverter(jwt -> jwt.getClaimAsStringList("roles").stream()
                .map(role -> (org.springframework.security.core.GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
                .toList());
        return converter;
    }

    public static boolean canManageOrders(Jwt jwt) {
        return jwt.getClaimAsStringList("roles").stream().anyMatch(role -> List.of("STAFF", "ADMIN").contains(role));
    }

    public static OAuth2TokenValidatorResult invalid() {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid JWT claims", null));
    }
}

