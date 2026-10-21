package com.bookstore.inventory.security;

import com.bookstore.inventory.controller.InventoryController;
import com.bookstore.inventory.controller.InternalInventoryController;
import com.bookstore.inventory.service.InventoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import java.util.*;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({InventoryController.class, InternalInventoryController.class})
@Import(SecurityConfig.class)
@TestPropertySource(properties = "inventory.service-jwt.secret=" + TestTokens.SERVICE_KEY)
class InventorySecurityTests extends JwtTestProperties {
    @Autowired MockMvc mvc;
    @MockBean InventoryService inventory;

    @Test
    void anonymousCannotReadInventoryTransactions() throws Exception {
        mvc.perform(get("/api/inventory/transactions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void customerCanReadOneStockButCannotManageInventory() throws Exception {
        String auth = "Bearer " + TestTokens.user("CUSTOMER");
        mvc.perform(get("/api/inventory/1").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(get("/api/inventory/transactions").header("Authorization", auth)).andExpect(status().isForbidden());
        mvc.perform(get("/api/inventory").header("Authorization", auth)).andExpect(status().isForbidden());
        mvc.perform(post("/api/inventory/import").header("Authorization", auth)
                .contentType("application/json").content("{\"bookId\":1,\"quantity\":2}"))
                .andExpect(status().isForbidden());
        verify(inventory).getStock(1L);
        verifyNoMoreInteractions(inventory);
    }

    @Test
    void staffCanManageStockButCannotUseInternalApi() throws Exception {
        String auth = "Bearer " + TestTokens.user("STAFF");
        mvc.perform(get("/api/inventory/transactions").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(post("/api/inventory/import").header("Authorization", auth)
                .contentType("application/json").content("{\"bookId\":1,\"quantity\":2}"))
                .andExpect(status().isOk());
        mvc.perform(post("/internal/inventory/orders/1/restore").header("Authorization", auth))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void serviceCanReadAndWriteOnlyWithMatchingScope() throws Exception {
        String read = "Bearer " + TestTokens.service("inventory.read", Map.of());
        String write = "Bearer " + TestTokens.service("inventory.write", Map.of());
        mvc.perform(get("/internal/inventory/1").header("Authorization", read)).andExpect(status().isOk());
        mvc.perform(post("/internal/inventory/orders/1/restore").header("Authorization", write)).andExpect(status().isNoContent());
        mvc.perform(post("/internal/inventory/orders/1/deduct").header("Authorization", write)
                .contentType("application/json").content("{\"items\":[{\"bookId\":1,\"quantity\":2}]}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/internal/inventory/1").header("Authorization", write)).andExpect(status().isForbidden());
        mvc.perform(post("/internal/inventory/orders/1/restore").header("Authorization", read)).andExpect(status().isForbidden());
        mvc.perform(get("/api/inventory/transactions").header("Authorization", write)).andExpect(status().isUnauthorized());
        verify(inventory).getStock(1L);
        verify(inventory).restore(1L);
        verify(inventory).deduct(eq(1L), anyList());
        verifyNoMoreInteractions(inventory);
    }

    @Test
    void rejectsForgedExpiredOrWrongAudienceInternalTokens() throws Exception {
        for (String token : new String[] {
                TestTokens.user("ADMIN"),
                TestTokens.user("ADMIN", Map.of("type", "service", "scope", "inventory.write")),
                TestTokens.service("inventory.write", Map.of("iss", "attacker")),
                TestTokens.service("inventory.write", Map.of("aud", List.of("other-service"))),
                TestTokens.service("inventory.write", Map.of("type", "access")),
                TestTokens.service("inventory.write", Map.of("exp", Date.from(Instant.now().minusSeconds(300))))
        }) {
            mvc.perform(post("/internal/inventory/orders/1/restore").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(inventory);
    }

    @Test
    void legacyPublicMutationPathsAreClosedEvenForAdmin() throws Exception {
        mvc.perform(post("/api/inventory/orders/1/restore")
                .header("Authorization", "Bearer " + TestTokens.user("ADMIN"))).andExpect(status().isForbidden());
        mvc.perform(post("/internal/inventory/orders/1/restore")).andExpect(status().isUnauthorized());
        verifyNoInteractions(inventory);
    }

    @Test
    void rejectsWrongUserIssuerAudienceRefreshAndLegacyRoleClaim() throws Exception {
        for (String token : List.of(
                TestTokens.user("CUSTOMER", Map.of("iss", "https://attacker.test")),
                TestTokens.user("CUSTOMER", Map.of("aud", List.of("other"))),
                TestTokens.user("CUSTOMER", Map.of("type", "refresh")),
                TestTokens.user("CUSTOMER", Map.of("roles", List.of(), "role", "ADMIN")))) {
            mvc.perform(get("/api/inventory/1").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(inventory);
    }
}
