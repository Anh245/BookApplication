package com.example.ai.Integration;

import java.util.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.example.ai.Client.CatalogClient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Rs256AuthenticationTests {
    @Autowired MockMvc mvc;
    @MockitoBean CatalogClient catalog;

    @DynamicPropertySource
    static void jwtProperties(DynamicPropertyRegistry properties) {
        properties.add("security.jwt.jwk-set-uri", TestTokens::jwksUri);
        properties.add("security.jwt.issuer", () -> TestTokens.ISSUER);
        properties.add("security.jwt.audience", () -> "bookstore");
    }

    @Test
    void sharedUserContractIsAuthenticatedAndRolesAreApplied() throws Exception {
        mvc.perform(delete("/api/ai/interactions").header("Authorization", "Bearer " + TestTokens.user("CUSTOMER")))
                .andExpect(status().isNoContent());
        mvc.perform(post("/internal/ai/purchases").header("Authorization", "Bearer " + TestTokens.user("ADMIN",
                        Map.of("scope", "ai.history.write"))).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/internal/ai/purchases").header("Authorization", "Bearer " + TestTokens.user("CUSTOMER",
                        Map.of("type", "service", "scope", "ai.history.write", "sub", "order-service")))
                        .contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/ai/interactions").header("Authorization", "Bearer " + TestTokens.user("ADMIN",
                        Map.of("type", "service", "scope", "ai.history.write")))).andExpect(status().isForbidden());
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
            mvc.perform(delete("/api/ai/interactions").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        }
    }
}
