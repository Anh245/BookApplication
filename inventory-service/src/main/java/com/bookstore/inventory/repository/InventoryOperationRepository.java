package com.bookstore.inventory.repository;

import com.bookstore.inventory.enums.InventoryTxType;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryOperationRepository {
    private final JdbcTemplate jdbc;

    public boolean lockAndIsCompleted(Long orderId, InventoryTxType type) {
        // A conflicting insert waits for the owner transaction. Do not catch a
        // uniqueness exception: PostgreSQL would leave that transaction aborted.
        jdbc.update("""
                INSERT INTO inventory_operations (order_id, type, completed)
                VALUES (?, ?, false) ON CONFLICT DO NOTHING
                """, orderId, type.name());
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT completed FROM inventory_operations
                WHERE order_id = ? AND type = ? FOR UPDATE
                """, Boolean.class, orderId, type.name()));
    }

    public void complete(Long orderId, InventoryTxType type) {
        jdbc.update("""
                UPDATE inventory_operations SET completed = true
                WHERE order_id = ? AND type = ?
                """, orderId, type.name());
    }
}
