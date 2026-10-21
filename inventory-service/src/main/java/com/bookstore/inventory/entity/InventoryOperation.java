package com.bookstore.inventory.entity;

import com.bookstore.inventory.enums.InventoryTxType;
import jakarta.persistence.*;

/** Durable idempotency key; stock changes and completion commit atomically. */
@Entity
@Table(name = "inventory_operations", uniqueConstraints =
        @UniqueConstraint(name = "uk_inventory_operation_order_type", columnNames = {"order_id", "type"}))
public class InventoryOperation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "operation_id")
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InventoryTxType type;

    @Column(nullable = false)
    private boolean completed;
}
