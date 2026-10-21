package com.example.ai.Integration;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.sun.net.httpserver.HttpServer;
import com.nimbusds.jwt.*;
import java.time.Instant;
import java.util.*;

final class TestTokens {
    static final String ISSUER = "https://issuer.test";
    private static final RSAKey RSA;
    private static final HttpServer JWKS;
    static {
        try {
            var generator = java.security.KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            var pair = generator.generateKeyPair();
            RSA = new RSAKey.Builder((java.security.interfaces.RSAPublicKey) pair.getPublic())
                    .privateKey(pair.getPrivate()).keyID("test-user-key").build();
            JWKS = HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
            JWKS.createContext("/jwks", exchange -> {
                byte[] body = new JWKSet(RSA.toPublicJWK()).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
                exchange.close();
            });
            JWKS.start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> JWKS.stop(0)));
        } catch (Exception error) { throw new ExceptionInInitializerError(error); }
    }

    static String jwksUri() { return "http://127.0.0.1:" + JWKS.getAddress().getPort() + "/jwks"; }

    // Test fixtures only; neither key is used by application defaults.
    static final String USER_KEY = "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=";
    static final String SERVICE_KEY = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU=";

    static String user(String role) throws Exception {
        return user(role, Map.of());
    }

    static String user(String role, Map<String, Object> overrides) throws Exception {
        var claims = new HashMap<String, Object>();
        claims.put("sub", "7");
        claims.put("username", "alice");
        claims.put("iss", ISSUER);
        claims.put("aud", List.of("bookstore"));
        claims.put("userId", 7L);
        claims.put("roles", List.of(role));
        claims.put("type", "access");
        claims.put("iat", Date.from(Instant.now()));
        claims.put("exp", Date.from(Instant.now().plusSeconds(60)));
        claims.putAll(overrides);
        if (overrides.get("userId") instanceof Number id) claims.put("sub", id.toString());
        var builder = new JWTClaimsSet.Builder();
        claims.forEach(builder::claim);
        var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(RSA.getKeyID()).build(), builder.build());
        jwt.sign(new RSASSASigner(RSA));
        return jwt.serialize();
    }

    static String service(String scope, Map<String, Object> overrides) throws Exception {
        var claims = new HashMap<String, Object>();
        claims.put("sub", "order-service");
        claims.put("iss", "order-service");
        claims.put("aud", List.of("inventory-service"));
        claims.put("type", "service");
        claims.put("scope", scope);
        claims.put("iat", Date.from(Instant.now()));
        claims.put("exp", Date.from(Instant.now().plusSeconds(60)));
        claims.putAll(overrides);
        return sign(SERVICE_KEY, claims);
    }

    static String sign(String secret, Map<String, Object> claims) throws Exception {
        var builder = new JWTClaimsSet.Builder();
        claims.forEach(builder::claim);
        var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), builder.build());
        jwt.sign(new MACSigner(Base64.getDecoder().decode(secret)));
        return jwt.serialize();
    }
}
