package com.bookstore.order.security;

import com.bookstore.order.entity.Order;
import com.bookstore.order.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OrderAuthorizationIntegrationTests extends JwtTestProperties {
    @Autowired MockMvc mvc;
    @Autowired OrderRepository orders;
    long orderId;

    @BeforeEach
    void createOrder() {
        Order order = new Order();
        order.setUserId(7L);
        order.setShippingAddress("Test address");
        order.setTotalAmount(BigDecimal.TEN);
        orderId = orders.saveAndFlush(order).getId();
    }

    @Test
    void customerCannotAccessVictimsOrderEvenWithSpoofedUserId() throws Exception {
        String auth = "Bearer " + TestTokens.user("CUSTOMER", Map.of("userId", 42L));
        String path = "/api/orders/" + orderId;
        mvc.perform(get("/api/orders/my").param("userId", "7").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get(path).param("userId", "7").header("Authorization", auth)).andExpect(status().isNotFound());
        mvc.perform(get(path + "/payments").header("Authorization", auth)).andExpect(status().isNotFound());
        mvc.perform(post(path + "/cancel").param("userId", "7").header("Authorization", auth)).andExpect(status().isNotFound());
        mvc.perform(post(path + "/payments").param("userId", "7").header("Authorization", auth)).andExpect(status().isNotFound());
    }

    @Test
    void ownerAndStaffCanReadOrderWithoutUserIdParameter() throws Exception {
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + TestTokens.user("CUSTOMER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.userId").value(7));
        mvc.perform(get("/api/orders/" + orderId).header("Authorization",
                "Bearer " + TestTokens.user("STAFF", Map.of("userId", 42L))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.userId").value(7));
    }
}
