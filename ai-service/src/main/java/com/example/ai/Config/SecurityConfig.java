package com.example.ai.Config;

import java.util.ArrayList;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.*;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class SecurityConfig {
    @Bean
    JwtDecoder jwtDecoder(@Value("${security.jwt.jwk-set-uri}") String jwks,
                          @Value("${security.jwt.issuer}") String issuer,
                          @Value("${security.jwt.audience}") String audience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwks)
                .jwsAlgorithm(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer), jwt -> {
                    if ("service".equals(jwt.getClaims().get("type"))) {
                        boolean valid = jwt.getExpiresAt() != null && jwt.getAudience().contains(audience)
                                && jwt.getSubject() != null && !jwt.getSubject().isBlank() && jwt.getSubject().length() <= 200
                                && jwt.getClaims().get("scope") instanceof String;
                        return valid ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success() : JwtContract.invalid();
                    }
                    return JwtContract.validateUser(jwt, audience);
                }));
        return decoder;
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http,
            @Value("${app.docs.enabled:true}") boolean docsEnabled) throws Exception {
        var roles = new JwtGrantedAuthoritiesConverter();
        roles.setAuthoritiesClaimName("roles");
        roles.setAuthorityPrefix("ROLE_");
        var scopes = new JwtGrantedAuthoritiesConverter();
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            var authorities = new ArrayList<GrantedAuthority>();
            if ("access".equals(jwt.getClaims().get("type"))) authorities.addAll(roles.convert(jwt));
            if ("service".equals(jwt.getClaims().get("type"))) authorities.addAll(scopes.convert(jwt));
            return authorities;
        });
        return http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**", "/v3/api-docs.yaml")
                            .access((authentication, context) ->
                                    new org.springframework.security.authorization.AuthorizationDecision(docsEnabled));
                    auth
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/internal/ai/purchases").hasAuthority("SCOPE_ai.history.write")
                        .requestMatchers("/api/ai/**").hasAnyRole("CUSTOMER", "STAFF", "ADMIN")
                        .anyRequest().denyAll();
                })
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(converter)))
                .build();
    }
}
