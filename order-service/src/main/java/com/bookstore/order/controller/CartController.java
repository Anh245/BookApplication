package com.bookstore.order.controller;

import com.bookstore.order.dto.*;
import com.bookstore.order.service.CartService;
import com.bookstore.order.security.JwtTokens;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public CartResponse getCart(@AuthenticationPrincipal Jwt jwt) {
        return cartService.getCart(JwtTokens.userId(jwt));
    }

    @PostMapping("/items")
    public CartResponse addItem(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CartItemRequest req) {
        return cartService.addItem(JwtTokens.userId(jwt), req);
    }

    @PutMapping("/items/{bookId}")
    public CartResponse updateQuantity(@AuthenticationPrincipal Jwt jwt, @PathVariable Long bookId,
                                       @Valid @RequestBody UpdateQuantityRequest req) {
        return cartService.updateQuantity(JwtTokens.userId(jwt), bookId, req.quantity());
    }

    @DeleteMapping("/items/{bookId}")
    public CartResponse removeItem(@AuthenticationPrincipal Jwt jwt, @PathVariable Long bookId) {
        return cartService.removeItem(JwtTokens.userId(jwt), bookId);
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@AuthenticationPrincipal Jwt jwt) {
        cartService.clearCart(JwtTokens.userId(jwt));
        return ResponseEntity.noContent().build();
    }
}
