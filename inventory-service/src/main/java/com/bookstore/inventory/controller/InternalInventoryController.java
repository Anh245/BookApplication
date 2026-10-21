package com.bookstore.inventory.controller;

import com.bookstore.inventory.dto.DeductRequest;
import com.bookstore.inventory.dto.StockResponse;
import com.bookstore.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/inventory")
@RequiredArgsConstructor
public class InternalInventoryController {
    private final InventoryService inventoryService;

    @GetMapping("/{bookId}")
    public StockResponse getStock(@PathVariable Long bookId) {
        return inventoryService.getStock(bookId);
    }

    @PostMapping("/orders/{orderId}/deduct")
    public ResponseEntity<Void> deduct(@PathVariable Long orderId, @Valid @RequestBody DeductRequest request) {
        inventoryService.deduct(orderId, request.items());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/orders/{orderId}/restore")
    public ResponseEntity<Void> restore(@PathVariable Long orderId) {
        inventoryService.restore(orderId);
        return ResponseEntity.noContent().build();
    }
}
