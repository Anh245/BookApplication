package com.example.catalog.Integration;

import java.util.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Rs256AuthenticationTests {
    @Autowired MockMvc mvc;
    

    @DynamicPropertySource
    static void jwtProperties(DynamicPropertyRegistry properties) {
        properties.add("security.jwt.jwk-set-uri", TestTokens::jwksUri);
        properties.add("security.jwt.issuer", () -> TestTokens.ISSUER);
        properties.add("security.jwt.audience", () -> "bookstore");
    }

    @Test
    void sharedUserContractIsAuthenticatedAndRolesAreApplied() throws Exception {
        mvc.perform(post("/api/catalog/categories").header("Authorization", "Bearer " + TestTokens.user("ADMIN"))
                .contentType("application/json").content("{\"name\":\"rsa-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/catalog/categories").header("Authorization", "Bearer " + TestTokens.user("CUSTOMER"))
                .contentType("application/json").content("{\"name\":\"forbidden\"}")).andExpect(status().isForbidden());
    }

    @Test
    void refusesWrongIssuerAudienceRefreshLegacyHmacAndMalformedClaims() throws Exception {
        for (String token : List.of(
                TestTokens.user("ADMIN", Map.of("iss", "https://attacker.test")),
                TestTokens.user("ADMIN", Map.of("aud", List.of("other"))),
                TestTokens.user("ADMIN", Map.of("type", "refresh")),
                TestTokens.user("ADMIN", Map.of("sub", "alice")),
                TestTokens.user("ADMIN", Map.of("roles", List.of(), "role", "ADMIN")),
                TestTokens.user("ADMIN", Map.of("exp", Date.from(Instant.now().minusSeconds(300)))),
                TestTokens.sign(TestTokens.USER_KEY, Map.of("sub", "7")))) {
            mvc.perform(post("/api/catalog/categories").header("Authorization", "Bearer " + token)
                    .contentType("application/json").content("{\"name\":\"invalid\"}")).andExpect(status().isUnauthorized());
        }
    }
}
