package com.bookstore.order.controller;

import com.bookstore.order.dto.PaymentCallbackRequest;
import com.bookstore.order.dto.PaymentResponse;
import com.bookstore.order.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("dev & !prod & !production")
@RequiredArgsConstructor
public class DevelopmentPaymentController {
    private final PaymentService paymentService;

    @PostMapping("/api/payments/mock/callback")
    public PaymentResponse callback(@Valid @RequestBody PaymentCallbackRequest request) {
        return paymentService.handleCallback(request);
    }
}
