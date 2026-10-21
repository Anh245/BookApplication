package com.bookstore.order.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    JwtDecoder jwtDecoder(@Value("${security.jwt.jwk-set-uri}") String jwks,
            @Value("${security.jwt.issuer}") String issuer, @Value("${security.jwt.audience}") String audience) {
        return JwtTokens.userDecoder(jwks, issuer, audience);
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, Environment environment,
            @Value("${payments.vnpay.enabled:false}") boolean vnpayEnabled) throws Exception {
        boolean development = environment.acceptsProfiles(Profiles.of("dev & !prod & !production"));
        return http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers("/api/payments/callback").denyAll()
                        .requestMatchers(HttpMethod.GET, "/api/payments/vnpay/ipn")
                            .access((authentication, context) -> new org.springframework.security.authorization.AuthorizationDecision(vnpayEnabled))
                        .requestMatchers(HttpMethod.POST, "/api/payments/mock/callback")
                            .access((authentication, context) -> new org.springframework.security.authorization.AuthorizationDecision(
                                development && authentication.get().getAuthorities().stream()
                                    .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"))))
                        .requestMatchers(HttpMethod.GET, "/api/orders").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.HEAD, "/api/orders").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/orders/*/status").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers("/api/cart", "/api/cart/**", "/api/orders", "/api/orders/**")
                            .hasAnyRole("CUSTOMER", "STAFF", "ADMIN")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(JwtTokens.userConverter())))
                .build();
    }
}

