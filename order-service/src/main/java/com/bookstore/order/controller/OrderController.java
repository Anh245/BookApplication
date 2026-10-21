package com.bookstore.order.controller;

import com.bookstore.order.dto.*;
import com.bookstore.order.enums.OrderStatus;
import com.bookstore.order.service.OrderService;
import com.bookstore.order.security.JwtTokens;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public OrderResponse placeOrder(@AuthenticationPrincipal Jwt jwt,
                                    @Valid @RequestBody PlaceOrderRequest req) {
        return orderService.placeOrder(JwtTokens.userId(jwt), req);
    }

    @GetMapping("/my")
    public List<OrderResponse> myOrders(@AuthenticationPrincipal Jwt jwt) {
        return orderService.getMyOrders(JwtTokens.userId(jwt));
    }

    @GetMapping
    public List<OrderResponse> allOrders(@RequestParam(required = false) OrderStatus status) {
        return orderService.getAllOrders(status);
    }

    @GetMapping("/{id}")
    public OrderResponse getOrder(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return orderService.getOrder(id, JwtTokens.userId(jwt), JwtTokens.canManageOrders(jwt));
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable Long id,
                                      @Valid @RequestBody UpdateStatusRequest req) {
        return orderService.updateStatus(id, req.status());
    }

    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return orderService.cancelByCustomer(JwtTokens.userId(jwt), id);
    }
}
