package com.bookstore.inventory.security;

import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    JwtDecoder userJwtDecoder(@Value("${security.jwt.jwk-set-uri}") String jwks,
            @Value("${security.jwt.issuer}") String issuer, @Value("${security.jwt.audience}") String audience) {
        return JwtTokens.userDecoder(jwks, issuer, audience);
    }

    @Bean
    JwtDecoder serviceJwtDecoder(@Value("${inventory.service-jwt.secret}") String secret) {
        var key = JwtTokens.key(secret);
        return JwtTokens.decoder(key, jwt -> {
            try {
                boolean valid = "service".equals(jwt.getClaims().get("type"))
                        && "order-service".equals(jwt.getClaims().get("iss"))
                        && "order-service".equals(jwt.getSubject())
                        && jwt.getAudience().contains("inventory-service")
                        && jwt.getIssuedAt() != null && jwt.getExpiresAt() != null
                        && !jwt.getIssuedAt().isAfter(Instant.now().plusSeconds(30))
                        && Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()).toSeconds() > 0
                        && Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()).toSeconds() <= 120;
                return valid ? OAuth2TokenValidatorResult.success() : JwtTokens.invalid();
            } catch (RuntimeException error) {
                return JwtTokens.invalid();
            }
        });
    }

    @Bean
    @Order(1)
    SecurityFilterChain internal(HttpSecurity http, @Qualifier("serviceJwtDecoder") JwtDecoder serviceJwtDecoder) throws Exception {
        return http.securityMatcher("/internal/inventory/**")
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/internal/inventory/*").hasAuthority("SCOPE_inventory.read")
                        .requestMatchers(HttpMethod.POST, "/internal/inventory/orders/*/deduct",
                                "/internal/inventory/orders/*/restore").hasAuthority("SCOPE_inventory.write")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.decoder(serviceJwtDecoder)))
                .build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain users(HttpSecurity http, @Qualifier("userJwtDecoder") JwtDecoder userJwtDecoder) throws Exception {
        return http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/inventory/orders/**").denyAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/inventory", "/api/inventory/transactions",
                                "/api/inventory/low-stock").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/inventory/*").hasAnyRole("CUSTOMER", "STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/inventory/import", "/api/inventory/adjust")
                            .hasAnyRole("STAFF", "ADMIN")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.decoder(userJwtDecoder)
                        .jwtAuthenticationConverter(JwtTokens.userConverter())))
                .build();
    }
}

