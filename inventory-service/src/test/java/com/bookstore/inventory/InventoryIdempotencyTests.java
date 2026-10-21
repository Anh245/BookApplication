package com.bookstore.inventory;

import com.bookstore.inventory.dto.StockItemRequest;
import com.bookstore.inventory.entity.Stock;
import com.bookstore.inventory.entity.InventoryTransaction;
import com.bookstore.inventory.exception.BadRequestException;
import com.bookstore.inventory.enums.InventoryTxType;
import com.bookstore.inventory.repository.InventoryTransactionRepository;
import com.bookstore.inventory.repository.StockRepository;
import com.bookstore.inventory.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.ArgumentMatchers.argThat;

@SpringBootTest
@ActiveProfiles("test")
class InventoryIdempotencyTests {
    @Autowired InventoryService service;
    @Autowired StockRepository stocks;
    @SpyBean InventoryTransactionRepository transactions;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void seedStock() {
        transactions.deleteAll();
        jdbc.update("DELETE FROM inventory_operations");
        stocks.deleteAll();
        Stock stock = new Stock();
        stock.setBookId(1L);
        stock.setQuantity(10);
        stocks.save(stock);
    }

    @Test
    void concurrentDeductChangesStockOnce() throws Exception {
        synchronizeLegacyCheck(101L, InventoryTxType.ORDER_DEDUCT);
        concurrently(() -> service.deduct(101L, List.of(new StockItemRequest(1L, 2))));
        assertThat(stocks.findById(1L).orElseThrow().getQuantity()).isEqualTo(8);
        assertThat(transactions.findByOrderIdAndType(101L, InventoryTxType.ORDER_DEDUCT)).hasSize(1);
    }

    @Test
    void concurrentRestoreChangesStockOnce() throws Exception {
        service.deduct(102L, List.of(new StockItemRequest(1L, 2)));
        synchronizeLegacyCheck(102L, InventoryTxType.ORDER_RESTORE);
        concurrently(() -> service.restore(102L));
        assertThat(stocks.findById(1L).orElseThrow().getQuantity()).isEqualTo(10);
        assertThat(transactions.findByOrderIdAndType(102L, InventoryTxType.ORDER_RESTORE)).hasSize(1);
    }

    @Test
    void failedDeductRollsBackOperationAndCanBeRetried() {
        List<StockItemRequest> items = List.of(new StockItemRequest(1L, 2), new StockItemRequest(2L, 1));
        assertThatThrownBy(() -> service.deduct(103L, items)).isInstanceOf(BadRequestException.class);
        assertThat(stocks.findById(1L).orElseThrow().getQuantity()).isEqualTo(10);
        assertThat(transactions.findByOrderIdAndType(103L, InventoryTxType.ORDER_DEDUCT)).isEmpty();
        assertThat(operationCount()).isZero();

        Stock second = new Stock();
        second.setBookId(2L);
        second.setQuantity(1);
        stocks.save(second);
        service.deduct(103L, items);
        service.deduct(103L, items);
        assertThat(stocks.findById(1L).orElseThrow().getQuantity()).isEqualTo(8);
        assertThat(stocks.findById(2L).orElseThrow().getQuantity()).isZero();
        assertThat(operationCount()).isEqualTo(1);
    }

    @Test
    void ledgerFailureRollsBackStockAndOperationTogether() {
        doThrow(new BadRequestException("Simulated ledger failure"))
                .when(transactions).save(argThat(tx -> tx != null && tx.getOrderId().equals(107L)));
        assertThatThrownBy(() -> service.deduct(107L, List.of(new StockItemRequest(1L, 2))))
                .isInstanceOf(BadRequestException.class);
        assertThat(stocks.findById(1L).orElseThrow().getQuantity()).isEqualTo(10);
        assertThat(transactions.findByOrderIdAndType(107L, InventoryTxType.ORDER_DEDUCT)).isEmpty();
        assertThat(operationCount()).isZero();
    }

    @Test
    void earlyRestoreDoesNotPreventLaterDeductAndRestore() {
        service.restore(104L);
        service.deduct(104L, List.of(new StockItemRequest(1L, 2)));
        service.restore(104L);
        service.restore(104L);
        service.deduct(104L, List.of(new StockItemRequest(1L, 2)));
        assertThat(stocks.findById(1L).orElseThrow().getQuantity()).isEqualTo(10);
        assertThat(operationCount()).isEqualTo(2);
        assertThat(transactions.findAll()).hasSize(2);
    }

    @Test
    void preservesLegacyDeductAndRestoreWithoutOperationKeys() {
        legacyTransaction(105L, InventoryTxType.ORDER_DEDUCT, -2);
        legacyTransaction(105L, InventoryTxType.ORDER_RESTORE, 2);
        service.deduct(105L, List.of(new StockItemRequest(1L, 2)));
        service.restore(105L);
        assertThat(stocks.findById(1L).orElseThrow().getQuantity()).isEqualTo(10);
        assertThat(transactions.findAll()).hasSize(2);
        assertThat(operationCount()).isEqualTo(2);
    }

    @Test
    void databaseRejectsDuplicateOrderAndOperationType() {
        service.deduct(106L, List.of(new StockItemRequest(1L, 2)));
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO inventory_operations (order_id, type, completed)
                VALUES (106, 'ORDER_DEDUCT', false)
                """)).isInstanceOf(DataIntegrityViolationException.class);
    }

    private int operationCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM inventory_operations", Integer.class);
    }

    private void legacyTransaction(long orderId, InventoryTxType type, int change) {
        InventoryTransaction tx = new InventoryTransaction();
        tx.setBookId(1L);
        tx.setOrderId(orderId);
        tx.setType(type);
        tx.setQuantityChange(change);
        tx.setQuantityAfter(10);
        transactions.save(tx);
    }

    // Force both requests to observe the old guard before either can lock stock.
    // A service using the operation lock no longer needs this unsafe guard.
    private void synchronizeLegacyCheck(long orderId, InventoryTxType type) {
        CyclicBarrier checked = new CyclicBarrier(2);
        doAnswer(invocation -> {
            boolean exists = !transactions.findByOrderIdAndType(orderId, type).isEmpty();
            checked.await(10, TimeUnit.SECONDS);
            return exists;
        }).when(transactions).existsByOrderIdAndType(eq(orderId), eq(type));
    }

    private void concurrently(Runnable action) throws Exception {
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            Callable<Void> request = () -> {
                start.await();
                action.run();
                return null;
            };
            Future<Void> first = executor.submit(request);
            Future<Void> second = executor.submit(request);
            start.countDown();
            first.get(20, TimeUnit.SECONDS);
            second.get(20, TimeUnit.SECONDS);
        }
    }
}
