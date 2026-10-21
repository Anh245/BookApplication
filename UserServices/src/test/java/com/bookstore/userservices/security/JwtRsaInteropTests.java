package com.bookstore.userservices.security;

import com.bookstore.userservices.entity.*;
import com.sun.net.httpserver.HttpServer;
import io.jsonwebtoken.*;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.security.oauth2.jwt.*;
import static org.assertj.core.api.Assertions.*;

class JwtRsaInteropTests {
    @TempDir Path directory;
    KeyPair pair;
    JwtSigningKeys keys;
    JwtService service;
    User user;

    @BeforeEach
    void setUp() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        pair = generator.generateKeyPair();
        keys = new JwtSigningKeys(pair, "user-key-1");
        service = new JwtService(keys, "https://issuer.test", "bookstore", 3600000, 86400000);
        user = User.builder().userId(7L).username("alice")
                .role(Role.builder().roleName(RoleName.CUSTOMER).build()).status(UserStatus.ACTIVE).build();
    }

    @Test
    void actualIssuerTokenCanBeVerifiedByNimbusUsingOnlyHttpPublicJwks() throws Exception {
        var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
        byte[] body = mapper.writeValueAsBytes(keys.publicJwks());
        var server = HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/jwks", exchange -> {
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            var decoder = NimbusJwtDecoder.withJwkSetUri("http://127.0.0.1:" + server.getAddress().getPort() + "/jwks").build();
            decoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefaultWithIssuer("https://issuer.test"),
                    new JwtClaimValidator<List<String>>("aud", audience -> audience != null && audience.contains("bookstore"))));
            var token = decoder.decode(service.generateToken(user));
            assertThat(token.getHeaders()).containsEntry("alg", "RS256").containsEntry("kid", "user-key-1");
            assertThat(token.getSubject()).isEqualTo("7");
            assertThat(token.getClaimAsStringList("roles")).containsExactly("CUSTOMER");
            assertThat(token.getAudience()).contains("bookstore");
            assertThat(new String(body, StandardCharsets.UTF_8)).doesNotContain("\"d\":", "\"p\":", "\"q\":");
        } finally { server.stop(0); }
    }

    @Test
    void pemKeysSurviveRestartWithoutChangingTokenVerification() throws Exception {
        Path privateFile = directory.resolve("private.pem");
        Path publicFile = directory.resolve("public.pem");
        Files.writeString(privateFile, pem("PRIVATE KEY", pair.getPrivate().getEncoded()));
        Files.writeString(publicFile, pem("PUBLIC KEY", pair.getPublic().getEncoded()));
        var loaded = new JwtSigningKeys(privateFile.toString(), publicFile.toString(), "user-key-1");
        var restarted = new JwtService(loaded, "https://issuer.test", "bookstore", 3600000, 86400000);
        assertThat(restarted.extractUsername(service.generateToken(user))).isEqualTo("alice");
        assertThat(loaded.publicJwks()).isEqualTo(keys.publicJwks());
    }

    @Test
    void issuerAudienceAlgorithmAndTokenTypeAreEnforced() {
        var wrongIssuer = new JwtService(keys, "https://attacker.test", "bookstore", 3600000, 86400000);
        var wrongAudience = new JwtService(keys, "https://issuer.test", "other", 3600000, 86400000);
        assertThatThrownBy(() -> service.extractUsername(wrongIssuer.generateToken(user))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> service.extractUsername(wrongAudience.generateToken(user))).isInstanceOf(JwtException.class);
        String legacy = Jwts.builder().subject("alice")
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(new byte[32])).compact();
        assertThatThrownBy(() -> service.extractUsername(legacy)).isInstanceOf(JwtException.class);
        assertThat(service.isTokenValid(service.generateRefreshToken(user), new CustomUserDetails(user))).isFalse();
        assertThat(service.isRefreshTokenValid(service.generateToken(user), user)).isFalse();
        assertThat(service.isRefreshTokenValid(service.generateRefreshToken(user), user)).isTrue();
    }

    @Test
    void weakOrMismatchedRsaPairsCannotStartIssuer() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(1024);
        assertThatThrownBy(() -> new JwtSigningKeys(generator.generateKeyPair(), "weak")).isInstanceOf(IllegalArgumentException.class);
        generator.initialize(2048);
        var other = generator.generateKeyPair();
        assertThatThrownBy(() -> new JwtSigningKeys(new KeyPair(other.getPublic(), pair.getPrivate()), "mismatch"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static String pem(String label, byte[] bytes) {
        return "-----BEGIN " + label + "-----\n" + Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(bytes)
                + "\n-----END " + label + "-----\n";
    }
}
