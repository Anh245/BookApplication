package com.bookstore.order.security;

import com.bookstore.order.controller.CartController;
import com.bookstore.order.controller.OrderController;
import com.bookstore.order.controller.PaymentController;
import com.bookstore.order.service.CartService;
import com.bookstore.order.service.OrderService;
import com.bookstore.order.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.util.Map;
import java.util.Date;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({CartController.class, OrderController.class, PaymentController.class})
@Import(SecurityConfig.class)
class OrderSecurityTests extends JwtTestProperties {
    @Autowired MockMvc mvc;
    @MockBean CartService carts;
    @MockBean OrderService orders;
    @MockBean PaymentService payments;

    @Test
    void anonymousCannotReadAnotherUsersOrders() throws Exception {
        mvc.perform(get("/api/orders/my").param("userId", "42"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cartIdentityComesFromSignedTokenEvenWithSpoofedQuery() throws Exception {
        mvc.perform(get("/api/cart").param("userId", "42")
                        .header("Authorization", "Bearer " + TestTokens.user("CUSTOMER")))
                .andExpect(status().isOk());
        verify(carts).getCart(7L);
    }

    @Test
    void orderAndPaymentIdentityComesFromSignedToken() throws Exception {
        String auth = "Bearer " + TestTokens.user("CUSTOMER");
        mvc.perform(get("/api/orders/my").param("userId", "42").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(get("/api/orders/1").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(get("/api/orders/1/payments").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(post("/api/orders/1/cancel").param("userId", "42").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(post("/api/orders/1/payments").param("userId", "42").header("Authorization", auth)).andExpect(status().isOk());
        verify(orders).getMyOrders(7L);
        verify(orders).getOrder(1L, 7L, false);
        verify(payments).getPayments(1L, 7L, false);
        verify(orders).cancelByCustomer(7L, 1L);
        verify(payments).createPayment(7L, 1L, null);
    }

    @Test
    void customerCannotListAllOrdersChangeStatusOrCallCallback() throws Exception {
        String auth = "Bearer " + TestTokens.user("CUSTOMER");
        mvc.perform(get("/api/orders").header("Authorization", auth)).andExpect(status().isForbidden());
        mvc.perform(head("/api/orders").header("Authorization", auth)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/orders/1/status").header("Authorization", auth)
                .contentType("application/json").content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/callback").header("Authorization", auth)
                .contentType("application/json").content("{\"transactionRef\":\"TXN-1\",\"success\":true}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(orders, payments);
    }

    @Test
    void cartMutationsAndCheckoutIgnoreSpoofedUserId() throws Exception {
        String auth = "Bearer " + TestTokens.user("CUSTOMER");
        mvc.perform(post("/api/cart/items").param("userId", "42").header("Authorization", auth)
                .contentType("application/json").content("{\"bookId\":1,\"quantity\":2}")).andExpect(status().isOk());
        mvc.perform(put("/api/cart/items/1").param("userId", "42").header("Authorization", auth)
                .contentType("application/json").content("{\"quantity\":3}")).andExpect(status().isOk());
        mvc.perform(delete("/api/cart/items/1").param("userId", "42").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(delete("/api/cart").param("userId", "42").header("Authorization", auth)).andExpect(status().isNoContent());
        mvc.perform(post("/api/orders").param("userId", "42").header("Authorization", auth)
                .contentType("application/json").content("{\"shippingAddress\":\"Test\",\"paymentMethod\":\"COD\"}"))
                .andExpect(status().isOk());
        verify(carts).addItem(eq(7L), any());
        verify(carts).updateQuantity(7L, 1L, 3);
        verify(carts).removeItem(7L, 1L);
        verify(carts).clearCart(7L);
        verify(orders).placeOrder(eq(7L), any());
    }

    @Test
    void simulatedPaymentCallbackIsDisabledOutsideDevelopmentEvenForAdmin() throws Exception {
        String body = "{\"transactionRef\":\"TXN-1\",\"success\":true}";
        mvc.perform(post("/api/payments/callback").header("Authorization", "Bearer " + TestTokens.user("STAFF"))
                .contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/callback").header("Authorization", "Bearer " + TestTokens.user("ADMIN"))
                .contentType("application/json").content(body)).andExpect(status().isForbidden());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"STAFF", "ADMIN"})
    void managersCanListAndReadOrders(String role) throws Exception {
        String auth = "Bearer " + TestTokens.user(role);
        mvc.perform(get("/api/orders").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(get("/api/orders/1").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(patch("/api/orders/1/status").header("Authorization", auth)
                .contentType("application/json").content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isOk());
        verify(orders).getOrder(1L, 7L, true);
    }

    @Test
    void invalidTokenSignatureAndClaimsAreUnauthorized() throws Exception {
        for (String token : new String[] {
                TestTokens.user("CUSTOMER", Map.of("iss", "https://attacker.test")),
                TestTokens.user("CUSTOMER", Map.of("aud", java.util.List.of("other"))),
                TestTokens.user("CUSTOMER", Map.of("roles", java.util.List.of(), "role", "ADMIN")),
                TestTokens.user("CUSTOMER", Map.of("type", "refresh")),
                TestTokens.user("CUSTOMER", Map.of("userId", 0)),
                TestTokens.user("CUSTOMER", Map.of("userId", 1.5)),
                TestTokens.user("CUSTOMER", Map.of("userId", "7")),
                TestTokens.user("CUSTOMER", Map.of("exp", Date.from(Instant.now().minusSeconds(300)))),
                TestTokens.user("ROOT"), TestTokens.service("inventory.write", Map.of()), "broken.token.value"
        }) {
            mvc.perform(get("/api/cart").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(carts);
    }
}
