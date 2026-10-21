package com.bookstore.order.security;

import com.bookstore.order.controller.DevelopmentPaymentController;
import com.bookstore.order.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DevelopmentPaymentController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("dev")
class DevelopmentPaymentCallbackTests extends JwtTestProperties {
    @Autowired MockMvc mvc;
    @MockBean PaymentService payments;

    @Test
    void onlyAdminCanSimulateInDevelopment() throws Exception {
        String body = "{\"transactionRef\":\"TXN-1\",\"success\":true}";
        mvc.perform(post("/api/payments/mock/callback").header("Authorization", "Bearer " + TestTokens.user("CUSTOMER"))
                .contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/payments/mock/callback").header("Authorization", "Bearer " + TestTokens.user("ADMIN"))
                .contentType("application/json").content(body)).andExpect(status().isOk());
        verify(payments).handleCallback(any());
    }
}

