package com.bookstore.inventory.security;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

abstract class JwtTestProperties {
    @DynamicPropertySource
    static void userJwtProperties(DynamicPropertyRegistry properties) {
        properties.add("security.jwt.issuer", () -> TestTokens.ISSUER);
        properties.add("security.jwt.audience", () -> "bookstore");
        properties.add("security.jwt.jwk-set-uri", TestTokens::jwksUri);
    }
}
