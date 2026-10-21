package com.bookstore.userservices.security;

import com.bookstore.userservices.config.SecurityConfig;
import com.bookstore.userservices.entity.Role;
import com.bookstore.userservices.entity.RoleName;
import com.bookstore.userservices.entity.User;
import com.bookstore.userservices.entity.UserStatus;
import com.bookstore.userservices.repository.UserRepository;
import com.bookstore.userservices.service.TokenBlacklistService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = JwtAccountStatusTests.TestConfig.class)
@TestPropertySource(properties = {
        "application.security.jwt.expiration=3600000",
        "application.security.jwt.refresh-expiration=86400000"
})
class JwtAccountStatusTests {
    @ParameterizedTest
    @ValueSource(strings = {"http://localhost:5173", "http://127.0.0.1:5173"})
    void viteLoginPreflightAllowsOnlyConfiguredOrigins(String origin) throws Exception {
        mvc.perform(options("/api/auth/login")
                        .header("Origin", origin)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", origin));
    }

    @Test
    void unrelatedOriginIsStillRejected() throws Exception {
        mvc.perform(options("/api/auth/login")
                        .header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Configuration
    @EnableWebMvc
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class,
            CustomUserDetailsService.class, ProbeController.class,
            com.bookstore.userservices.controller.JwksController.class})
    static class TestConfig {
        @org.springframework.context.annotation.Bean
        JwtSigningKeys signingKeys() throws Exception {
            var generator = java.security.KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return new JwtSigningKeys(generator.generateKeyPair(), "test-key");
        }
    }

    @RestController
    static class ProbeController {
        @GetMapping("/api/test/protected")
        String protectedResource(Authentication authentication) { return authentication.getName(); }

        @GetMapping("/api/auth/login")
        String publicResource() { return "public"; }
    }

    @Autowired WebApplicationContext context;
    @Autowired JwtService jwtService;
    @MockitoBean UserRepository users;
    @MockitoBean TokenBlacklistService blacklist;
    @MockitoBean com.bookstore.userservices.service.AuthSessionService sessions;
    MockMvc mvc;
    User user;
    String accessToken;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        user = User.builder().userId(7L).username("alice").password("unused-in-bearer-auth")
                .role(Role.builder().roleName(RoleName.CUSTOMER).build()).status(UserStatus.ACTIVE).build();
        accessToken = jwtService.generateToken(user);
        lenient().when(sessions.isAccessSessionActive(accessToken, 7L)).thenReturn(true);
    }

    @Test
    void activeAccountCanUseSignedAccessToken() throws Exception {
        when(users.findByUsernameOrEmail("alice", "alice")).thenReturn(Optional.of(user));
        mvc.perform(get("/api/test/protected").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk()).andExpect(content().string("alice"));
    }

    @Test
    void accessTokenUsesTheSharedRsaContract() {
        String[] parts = accessToken.split("\\.");
        String header = new String(java.util.Base64.getUrlDecoder().decode(parts[0]), java.nio.charset.StandardCharsets.UTF_8);
        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(header).contains("\"alg\":\"RS256\"", "\"kid\":");
        assertThat(payload).contains("\"iss\":", "\"aud\":", "\"roles\":[\"CUSTOMER\"]", "\"sub\":\"7\"");
    }

    @Test
    void publicJwksPublishesOnlyVerificationMaterial() throws Exception {
        mvc.perform(get("/.well-known/jwks.json")).andExpect(status().isOk())
                .andExpect(jsonPath("$.keys[0].kid").value("test-key"))
                .andExpect(jsonPath("$.keys[0].alg").value("RS256"))
                .andExpect(jsonPath("$.keys[0].n").isString())
                .andExpect(jsonPath("$.keys[0].e").isString())
                .andExpect(jsonPath("$.keys[0].d").doesNotExist())
                .andExpect(jsonPath("$.keys[0].p").doesNotExist())
                .andExpect(jsonPath("$.keys[0].q").doesNotExist());
    }

    @Test
    void lockingAccountRejectsTheSamePreviouslyWorkingTokenOnNextRequest() throws Exception {
        when(users.findByUsernameOrEmail("alice", "alice")).thenReturn(Optional.of(user));
        mvc.perform(get("/api/test/protected").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
        user.setStatus(UserStatus.LOCKED);
        mvc.perform(get("/api/test/protected").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
        verify(users, times(2)).findByUsernameOrEmail("alice", "alice");
    }

    @Test
    void unknownAccountStatusDoesNotGrantAuthentication() throws Exception {
        user.setStatus(null);
        when(users.findByUsernameOrEmail("alice", "alice")).thenReturn(Optional.of(user));
        mvc.perform(get("/api/test/protected").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void lockedAccountDoesNotBlockPublicRoutes() throws Exception {
        user.setStatus(UserStatus.LOCKED);
        when(users.findByUsernameOrEmail("alice", "alice")).thenReturn(Optional.of(user));
        mvc.perform(get("/api/auth/login").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk()).andExpect(content().string("public"));
    }

    @Test
    void blacklistedTokenStillCannotAccessProtectedResource() throws Exception {
        when(blacklist.isBlacklisted(accessToken)).thenReturn(true);
        mvc.perform(get("/api/test/protected").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(users);
    }

    @Test
    void activeAccountCannotUseRefreshTokenAsAccessToken() throws Exception {
        when(users.findByUsernameOrEmail("alice", "alice")).thenReturn(Optional.of(user));
        mvc.perform(get("/api/test/protected").header("Authorization", "Bearer " + jwtService.generateRefreshToken(user)))
                .andExpect(status().isUnauthorized());
    }
}
