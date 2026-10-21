package com.bookstore.order.controller;

import com.bookstore.order.dto.CreatePaymentRequest;
import com.bookstore.order.dto.PaymentResponse;
import com.bookstore.order.service.PaymentService;
import com.bookstore.order.security.JwtTokens;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/api/orders/{orderId}/payments")
    public PaymentResponse createPayment(@PathVariable Long orderId, @AuthenticationPrincipal Jwt jwt,
                                         @RequestBody(required = false) CreatePaymentRequest req) {
        return paymentService.createPayment(JwtTokens.userId(jwt), orderId, req == null ? null : req.method());
    }

    @GetMapping("/api/orders/{orderId}/payments")
    public List<PaymentResponse> getPayments(@PathVariable Long orderId, @AuthenticationPrincipal Jwt jwt) {
        return paymentService.getPayments(orderId, JwtTokens.userId(jwt), JwtTokens.canManageOrders(jwt));
    }

}
