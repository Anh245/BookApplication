package com.bookstore.userservices.security;

import com.bookstore.userservices.dto.request.LoginRequest;
import com.bookstore.userservices.dto.request.RefreshTokenRequest;
import com.bookstore.userservices.dto.response.AuthResponse;
import com.bookstore.userservices.entity.*;
import com.bookstore.userservices.exception.AppException;
import com.bookstore.userservices.repository.*;
import com.bookstore.userservices.service.*;
import com.bookstore.userservices.service.impl.AuthServiceImpl;
import com.bookstore.userservices.config.SecurityConfig;
import com.bookstore.userservices.controller.AuthController;
import com.bookstore.userservices.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import javax.sql.DataSource;
import java.security.KeyPairGenerator;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import java.time.Instant;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(RefreshSessionTests.Config.class)
@WebAppConfiguration
@TestPropertySource(properties = {
        "application.security.jwt.expiration=3600000",
        "application.security.jwt.refresh-expiration=86400000"})
class RefreshSessionTests {
    @Configuration
    @EnableTransactionManagement
    @EnableWebMvc
    @EnableJpaRepositories(basePackageClasses = UserRepository.class)
    @Import({AuthServiceImpl.class, JwtService.class, AuthSessionService.class, SecurityConfig.class,
            JwtAuthenticationFilter.class, CustomUserDetailsService.class, AuthController.class,
            GlobalExceptionHandler.class, ProbeController.class})
    static class Config {
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource("jdbc:h2:mem:refresh_sessions;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("com.bookstore.userservices.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }
        @Bean JpaTransactionManager transactionManager(jakarta.persistence.EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }
        @Bean JwtSigningKeys signingKeys() throws Exception {
            var generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return new JwtSigningKeys(generator.generateKeyPair(), "session-test-key");
        }
    }

    @RestController
    static class ProbeController {
        @GetMapping("/api/test/session")
        String who(Authentication authentication) { return authentication.getName(); }
    }

    @Autowired AuthService auth;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired AuthSessionRepository sessions;
    @Autowired AuthSessionService sessionService;
    @MockitoSpyBean JwtService jwt;
    @Autowired PlatformTransactionManager manager;
    @Autowired WebApplicationContext context;
    @MockitoBean PasswordEncoder passwords;
    @MockitoBean RateLimitService rateLimit;
    @MockitoBean TokenBlacklistService blacklist;
    @MockitoBean OtpService otp;
    @MockitoBean EmailService email;
    String username;
    MockMvc mvc;

    @BeforeEach
    void createUser() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        username = "u" + UUID.randomUUID().toString().replace("-", "");
        Role role = roles.findByRoleName(RoleName.CUSTOMER).orElseGet(() ->
                roles.save(Role.builder().roleName(RoleName.CUSTOMER).description("Customer").build()));
        users.save(User.builder().username(username).password("test-hash").email(username + "@example.test")
                .fullName("Test user").role(role).status(UserStatus.ACTIVE).build());
        when(passwords.matches("test-password", "test-hash")).thenReturn(true);
        when(rateLimit.tryConsumeLogin(username)).thenReturn(true);
    }

    @Test
    void refreshCannotBeReusedAfterRotation() {
        AuthResponse original = login();
        AuthResponse rotated = refresh(original.getRefreshToken());
        assertThat(rotated.getRefreshToken()).isNotEqualTo(original.getRefreshToken());
        assertThatThrownBy(() -> refresh(original.getRefreshToken())).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> refresh(rotated.getRefreshToken())).isInstanceOf(AppException.class);
        assertThat(sessionService.isAccessSessionActive(rotated.getAccessToken(), rotated.getUserId())).isFalse();
    }

    @Test
    void logoutRevokesRefreshTokensFromTheSameFamily() {
        AuthResponse original = login();
        AuthResponse rotated = refresh(original.getRefreshToken());
        auth.logout("Bearer " + original.getAccessToken());
        assertThatThrownBy(() -> refresh(original.getRefreshToken())).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> refresh(rotated.getRefreshToken())).isInstanceOf(AppException.class);
    }

    @Test
    void logoutRejectsAllFamilyAccessTokensWithoutRelyingOnRedis() throws Exception {
        AuthResponse original = login();
        AuthResponse rotated = refresh(original.getRefreshToken());
        mvc.perform(get("/api/test/session").header("Authorization", "Bearer " + rotated.getAccessToken()))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + original.getAccessToken()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        when(blacklist.isBlacklisted(anyString())).thenReturn(false);
        for (String access : List.of(original.getAccessToken(), rotated.getAccessToken())) {
            mvc.perform(get("/api/test/session").header("Authorization", "Bearer " + access))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/refresh-token").contentType("application/json")
                .content("{\"refreshToken\":\"" + rotated.getRefreshToken() + "\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void logoutOnlyRevokesTheSelectedLoginSession() {
        AuthResponse first = login();
        AuthResponse second = login();
        auth.logout("Bearer " + first.getAccessToken());
        auth.logout("Bearer " + first.getAccessToken());
        assertThatThrownBy(() -> refresh(first.getRefreshToken())).isInstanceOf(AppException.class);
        AuthResponse rotated = refresh(second.getRefreshToken());
        assertThat(sessionService.isAccessSessionActive(rotated.getAccessToken(), rotated.getUserId())).isTrue();
    }

    @Test
    void refreshRotatesHashAndKeepsAbsoluteFamilyExpiration() {
        AuthResponse original = login();
        String sessionId = jwt.extractClaim(original.getRefreshToken(), claims -> claims.get("sid", String.class));
        AuthSession before = sessions.findById(sessionId).orElseThrow();
        assertThat(before.getRefreshTokenHash()).hasSize(64).doesNotContain(original.getRefreshToken());
        AuthResponse rotated = refresh(original.getRefreshToken());
        AuthSession after = sessions.findById(sessionId).orElseThrow();
        assertThat(after.getRefreshTokenHash()).isNotEqualTo(before.getRefreshTokenHash());
        assertThat(jwt.extractExpiration(rotated.getRefreshToken())).isEqualTo(jwt.extractExpiration(original.getRefreshToken()));
        assertThat(jwt.<String>extractClaim(rotated.getAccessToken(), claims -> claims.get("sid", String.class))).isEqualTo(sessionId);
    }

    @Test
    void legacyAndWrongTypeTokensCannotCreateNewSessions() throws Exception {
        User user = users.findByUsername(username).orElseThrow();
        assertThatThrownBy(() -> refresh(jwt.generateRefreshToken(user))).isInstanceOf(AppException.class);
        AuthResponse pair = login();
        assertThatThrownBy(() -> refresh(pair.getAccessToken())).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> auth.logout("Bearer " + pair.getRefreshToken())).isInstanceOf(AppException.class);
        mvc.perform(get("/api/test/session").header("Authorization", "Bearer " + jwt.generateToken(user)))
                .andExpect(status().isUnauthorized());
        assertThat(refresh(pair.getRefreshToken()).getAccessToken()).isNotBlank();
    }

    @Test
    void expiredSessionAndLockedAccountCannotRefresh() {
        AuthResponse expired = login();
        String id = jwt.extractClaim(expired.getRefreshToken(), claims -> claims.get("sid", String.class));
        AuthSession session = sessions.findById(id).orElseThrow();
        session.setExpiresAt(Instant.now().minusSeconds(1));
        sessions.save(session);
        assertThatThrownBy(() -> refresh(expired.getRefreshToken())).isInstanceOf(AppException.class);
        AuthResponse active = login();
        User user = users.findByUsername(username).orElseThrow();
        user.setStatus(UserStatus.LOCKED);
        users.save(user);
        assertThatThrownBy(() -> refresh(active.getRefreshToken())).isInstanceOf(AppException.class);
    }

    @Test
    void simultaneousRefreshAcceptsAtMostOneAndRevokesReplayedFamily() throws Exception {
        AuthResponse original = login();
        List<AuthResponse> successes = new ArrayList<>();
        int rejected = 0;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            Callable<AuthResponse> request = () -> { start.await(); return refresh(original.getRefreshToken()); };
            var first = executor.submit(request);
            var second = executor.submit(request);
            start.countDown();
            for (Future<AuthResponse> requestResult : List.of(first, second)) {
                try { successes.add(requestResult.get(10, TimeUnit.SECONDS)); }
                catch (ExecutionException error) {
                    assertThat(error.getCause()).isInstanceOf(AppException.class);
                    rejected++;
                }
            }
        }
        assertThat(successes).hasSize(1);
        assertThat(rejected).isEqualTo(1);
        assertThatThrownBy(() -> refresh(successes.getFirst().getRefreshToken())).isInstanceOf(AppException.class);
    }

    @Test
    void refreshWaitsForLogoutAndCannotEscapeRevocation() throws Exception {
        AuthResponse original = login();
        CountDownLatch logoutHoldsLock = new CountDownLatch(1);
        CountDownLatch releaseLogout = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> logout = executor.submit(() -> new TransactionTemplate(manager).executeWithoutResult(status -> {
                auth.logout("Bearer " + original.getAccessToken());
                logoutHoldsLock.countDown();
                await(releaseLogout);
            }));
            assertThat(logoutHoldsLock.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> refresh = executor.submit(() -> refresh(original.getRefreshToken()));
            try {
                assertThatThrownBy(() -> refresh.get(150, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            } finally { releaseLogout.countDown(); }
            logout.get(10, TimeUnit.SECONDS);
            assertThatThrownBy(() -> refresh.get(10, TimeUnit.SECONDS)).isInstanceOf(ExecutionException.class)
                    .hasCauseInstanceOf(AppException.class);
        }
        assertThat(sessionService.isAccessSessionActive(original.getAccessToken(), original.getUserId())).isFalse();
    }

    @Test
    void logoutWaitsForRotationAndRevokesTheNewPair() throws Exception {
        AuthResponse original = login();
        CountDownLatch refreshHoldsLock = new CountDownLatch(1);
        CountDownLatch releaseRefresh = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<AuthResponse> refresh = executor.submit(() -> new TransactionTemplate(manager).execute(status -> {
                AuthResponse rotated = refresh(original.getRefreshToken());
                refreshHoldsLock.countDown();
                await(releaseRefresh);
                return rotated;
            }));
            assertThat(refreshHoldsLock.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> logout = executor.submit(() -> auth.logout("Bearer " + original.getAccessToken()));
            try {
                assertThatThrownBy(() -> logout.get(150, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            } finally { releaseRefresh.countDown(); }
            AuthResponse rotated = refresh.get(10, TimeUnit.SECONDS);
            logout.get(10, TimeUnit.SECONDS);
            assertThatThrownBy(() -> refresh(rotated.getRefreshToken())).isInstanceOf(AppException.class);
            assertThat(sessionService.isAccessSessionActive(rotated.getAccessToken(), rotated.getUserId())).isFalse();
        }
    }

    @Test
    void failedCommitDoesNotConsumeTheOriginalRefreshToken() {
        AuthResponse original = login();
        String id = jwt.extractClaim(original.getRefreshToken(), claims -> claims.get("sid", String.class));
        String previousHash = sessions.findById(id).orElseThrow().getRefreshTokenHash();
        doAnswer(call -> {
            Object result = call.callRealMethod();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void beforeCommit(boolean readOnly) {
                    throw new IllegalStateException("Simulated rotation commit failure");
                }
            });
            return result;
        }).doCallRealMethod().when(jwt).generateToken(any(User.class), eq(id));
        assertThatThrownBy(() -> refresh(original.getRefreshToken())).isInstanceOf(IllegalStateException.class);
        AuthSession unchanged = sessions.findById(id).orElseThrow();
        assertThat(unchanged.getRefreshTokenHash()).isEqualTo(previousHash);
        assertThat(unchanged.isRevoked()).isFalse();
        assertThat(refresh(original.getRefreshToken()).getRefreshToken()).isNotEqualTo(original.getRefreshToken());
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Test gate timed out");
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(error);
        }
    }

    private AuthResponse login() { return auth.login(new LoginRequest(username, "test-password")); }
    private AuthResponse refresh(String token) { return auth.refreshToken(new RefreshTokenRequest(token)); }
}
