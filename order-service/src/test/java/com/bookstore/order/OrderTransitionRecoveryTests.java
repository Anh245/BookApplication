package com.bookstore.order;

import com.bookstore.order.client.InventoryClient;
import com.bookstore.order.entity.OrderTransition;
import com.bookstore.order.exception.BadRequestException;
import com.bookstore.order.exception.ResourceNotFoundException;
import com.bookstore.order.entity.Order;
import com.bookstore.order.entity.OrderItem;
import com.bookstore.order.exception.ServiceUnavailableException;
import com.bookstore.order.repository.OrderRepository;
import com.bookstore.order.repository.OrderTransitionRepository;
import com.bookstore.order.service.OrderService;
import com.bookstore.order.service.OrderTransitionCoordinator;
import com.bookstore.order.service.OrderTransitionRecovery;
import com.bookstore.order.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.*;
import java.util.Set;
import java.time.LocalDateTime;
import static com.bookstore.order.enums.OrderStatus.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = "orders.recovery.enabled=false")
@ActiveProfiles("test")
class OrderTransitionRecoveryTests {
    @Autowired OrderService service;
    @SpyBean OrderRepository orders;
    @MockBean InventoryClient inventory;
    @Autowired JdbcTemplate jdbc;
    @Autowired OrderTransitionRepository transitions;
    @Autowired OrderTransitionCoordinator coordinator;
    @Autowired PlatformTransactionManager manager;
    @SpyBean PaymentService payments;
    long orderId;
    AtomicInteger stock;
    Set<Long> deducted;
    Set<Long> restored;

    @BeforeEach
    void seedOrder() {
        Order order = new Order();
        order.setUserId(7L);
        order.setShippingAddress("Test address");
        order.setTotalAmount(BigDecimal.TEN);
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setBookId(1L);
        item.setBookTitle("Book");
        item.setQuantity(2);
        item.setUnitPrice(BigDecimal.valueOf(5));
        order.getItems().add(item);
        orderId = orders.saveAndFlush(order).getId();
        stock = new AtomicInteger(10);
        deducted = ConcurrentHashMap.newKeySet();
        restored = ConcurrentHashMap.newKeySet();
        doAnswer(call -> { deductOnce(); return null; }).when(inventory).deduct(eq(orderId), anyList());
        doAnswer(call -> {
            if (deducted.contains(orderId) && restored.add(orderId)) stock.addAndGet(2);
            return null;
        }).when(inventory).restore(eq(orderId), anyList());
    }

    @Test
    void localFailureAfterDeductKeepsDurableRecoveryIntent() {
        doThrow(new IllegalStateException("Simulated database failure"))
                .when(orders).save(argThat(order -> order != null && order.getId().equals(orderId)));
        assertThatThrownBy(() -> service.updateStatus(orderId, CONFIRMED))
                .isInstanceOf(RuntimeException.class);
        assertThat(stock.get()).isEqualTo(8);
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(PENDING);
        assertThat(pendingCount()).isEqualTo(1);
        reset(orders);
        recoverWithNewWorker();
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CONFIRMED);
        assertThat(stock.get()).isEqualTo(8);
        assertThat(pendingCount()).isZero();
        service.cancelByCustomer(7L, orderId);
        assertThat(stock.get()).isEqualTo(10);
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CANCELLED);
    }

    @Test
    void lostInventoryReplyKeepsIntentAndBlocksCancellation() {
        AtomicBoolean loseReply = new AtomicBoolean(true);
        doAnswer(call -> {
            deductOnce();
            if (loseReply.getAndSet(false)) {
                throw new ServiceUnavailableException("Lost reply after inventory commit");
            }
            return null;
        }).when(inventory).deduct(eq(orderId), anyList());
        assertThatThrownBy(() -> service.updateStatus(orderId, CONFIRMED))
                .isInstanceOf(ServiceUnavailableException.class);
        assertThatThrownBy(() -> service.cancelByCustomer(7L, orderId))
                .isInstanceOf(ServiceUnavailableException.class);
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(PENDING);
        assertThat(pendingCount()).isEqualTo(1);
        verify(inventory, never()).restore(anyLong(), anyList());
        recoverWithNewWorker();
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CONFIRMED);
        assertThat(stock.get()).isEqualTo(8);
        service.cancelByCustomer(7L, orderId);
        assertThat(stock.get()).isEqualTo(10);
    }

    @Test
    void commitFailureAfterDeductRemainsRecoverable() {
        AtomicBoolean failCommit = new AtomicBoolean(true);
        doAnswer(call -> {
            deductOnce();
            if (failCommit.getAndSet(false)) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void beforeCommit(boolean readOnly) {
                        throw new IllegalStateException("Simulated commit failure");
                    }
                });
            }
            return null;
        }).when(inventory).deduct(eq(orderId), anyList());
        assertThatThrownBy(() -> service.updateStatus(orderId, CONFIRMED)).isInstanceOf(RuntimeException.class);
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(PENDING);
        assertThat(pendingCount()).isEqualTo(1);
        recoverWithNewWorker();
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CONFIRMED);
        assertThat(stock.get()).isEqualTo(8);
        assertThat(pendingCount()).isZero();
    }

    @Test
    void localPaymentFailureAfterRestoreCanRecoverWithoutRestoringTwice() {
        service.updateStatus(orderId, CONFIRMED);
        doThrow(new IllegalStateException("Payment write failed")).doCallRealMethod()
                .when(payments).onOrderClosed(any(Order.class));
        assertThatThrownBy(() -> service.cancelByCustomer(7L, orderId)).isInstanceOf(RuntimeException.class);
        assertThat(stock.get()).isEqualTo(10);
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CONFIRMED);
        assertThat(pendingCount()).isEqualTo(1);
        assertThatThrownBy(() -> service.updateStatus(orderId, PREPARING))
                .isInstanceOf(ServiceUnavailableException.class);
        recoverWithNewWorker();
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CANCELLED);
        assertThat(stock.get()).isEqualTo(10);
        assertThat(pendingCount()).isZero();
    }

    @Test
    void rejectedStockDoesNotLeaveOrderBlocked() {
        doThrow(new BadRequestException("Insufficient stock"))
                .when(inventory).deduct(eq(orderId), anyList());
        assertThatThrownBy(() -> service.updateStatus(orderId, CONFIRMED)).isInstanceOf(BadRequestException.class);
        assertThat(pendingCount()).isZero();
        assertThat(transitions.findAll().stream().filter(t -> t.getOrderId().equals(orderId)))
                .allMatch(t -> t.getState() == OrderTransition.State.REJECTED);
        service.cancelByCustomer(7L, orderId);
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CANCELLED);
        assertThat(stock.get()).isEqualTo(10);
        verify(inventory, never()).restore(eq(orderId), anyList());
    }

    @Test
    void unauthorizedCustomerCannotCreateRecoveryIntent() {
        assertThatThrownBy(() -> service.cancelByCustomer(42L, orderId)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(pendingCount()).isZero();
        verifyNoInteractions(inventory);
    }

    @Test
    void staleOrderCannotOverwriteConfirmedStatus() {
        Order stale = orders.findById(orderId).orElseThrow();
        service.updateStatus(orderId, CONFIRMED);
        stale.setShippingAddress("Stale write");
        assertThatThrownBy(() -> orders.saveAndFlush(stale)).isInstanceOf(ObjectOptimisticLockingFailureException.class);
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CONFIRMED);
    }

    @Test
    void concurrentConfirmAndCancelRestoresConfirmedDeduction() throws Exception {
        CountDownLatch deductEntered = new CountDownLatch(1);
        CountDownLatch releaseDeduct = new CountDownLatch(1);
        doAnswer(call -> {
            deductOnce();
            deductEntered.countDown();
            if (!releaseDeduct.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Test gate timed out");
            return null;
        }).when(inventory).deduct(eq(orderId), anyList());
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> confirm = executor.submit(() -> service.updateStatus(orderId, CONFIRMED));
            assertThat(deductEntered.await(5, TimeUnit.SECONDS)).isTrue();
            CountDownLatch cancelStarted = new CountDownLatch(1);
            Future<?> cancel = executor.submit(() -> {
                cancelStarted.countDown();
                return service.cancelByCustomer(7L, orderId);
            });
            try {
                assertThat(cancelStarted.await(5, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> cancel.get(150, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            } finally {
                releaseDeduct.countDown();
            }
            confirm.get(10, TimeUnit.SECONDS);
            cancel.get(10, TimeUnit.SECONDS);
        }
        assertThat(orders.findById(orderId).orElseThrow().getOrderStatus()).isEqualTo(CANCELLED);
        assertThat(stock.get()).isEqualTo(10);
        verify(inventory, times(1)).deduct(eq(orderId), anyList());
        verify(inventory, times(1)).restore(eq(orderId), anyList());
    }

    @Test
    void twoRecoveryWorkersExecutePendingTransitionOnce() throws Exception {
        OrderTransition intent = new OrderTransition();
        intent.setOrderId(orderId);
        intent.setSourceStatus(PENDING);
        intent.setTargetStatus(CONFIRMED);
        long transitionId = transitions.saveAndFlush(intent).getId();
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            Callable<Order> work = () -> { start.await(); return coordinator.process(transitionId); };
            Future<Order> first = executor.submit(work);
            Future<Order> second = executor.submit(work);
            start.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS).getOrderStatus()).isEqualTo(CONFIRMED);
            assertThat(second.get(10, TimeUnit.SECONDS).getOrderStatus()).isEqualTo(CONFIRMED);
        }
        verify(inventory, times(1)).deduct(eq(orderId), anyList());
        assertThat(stock.get()).isEqualTo(8);
        assertThat(pendingCount()).isZero();
    }

    private void deductOnce() {
        if (deducted.add(orderId)) stock.addAndGet(-2);
    }

    private void recoverWithNewWorker() {
        jdbc.update("UPDATE order_transitions SET next_attempt_at = ? WHERE order_id = ?",
                LocalDateTime.now().minusMinutes(1), orderId);
        var restarted = new OrderTransitionCoordinator(orders, transitions, inventory, payments, manager);
        new OrderTransitionRecovery(transitions, restarted).retryPending();
    }

    private int pendingCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM order_transitions WHERE order_id = ? AND state = 'PENDING'",
                Integer.class, orderId);
    }
}
