package com.bookstore.order.security;

import com.bookstore.order.entity.Order;
import com.bookstore.order.exception.ResourceNotFoundException;
import com.bookstore.order.repository.*;
import com.bookstore.order.client.*;
import com.bookstore.order.service.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderOwnershipTests {
    @Mock OrderRepository orders;
    @Mock CartRepository carts;
    @Mock CatalogClient catalog;
    @Mock InventoryClient inventory;
    @Mock PaymentRepository payments;
    OrderService orderService;
    PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(payments, orders);
        var coordinator = new OrderTransitionCoordinator(orders, mock(OrderTransitionRepository.class), inventory,
                paymentService, mock(org.springframework.transaction.PlatformTransactionManager.class));
        orderService = new OrderService(orders, carts, catalog, inventory, coordinator);
        Order order = new Order();
        order.setId(1L);
        order.setUserId(7L);
        order.setTotalAmount(BigDecimal.TEN);
        when(orders.findById(1L)).thenReturn(Optional.of(order));
    }

    @Test
    void anotherCustomerCannotReadOrderOrPayments() {
        assertThatThrownBy(() -> orderService.getOrder(1L, 42L, false)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> paymentService.getPayments(1L, 42L, false)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(payments);
    }

    @Test
    void ownerCanReadOrderAndPayments() {
        when(payments.findByOrderIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        assertThat(orderService.getOrder(1L, 7L, false).userId()).isEqualTo(7L);
        assertThat(paymentService.getPayments(1L, 7L, false)).isEmpty();
    }

    @Test
    void managerCanReadAnotherUsersOrderAndPayments() {
        when(payments.findByOrderIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());
        assertThat(orderService.getOrder(1L, 42L, true).userId()).isEqualTo(7L);
        assertThat(paymentService.getPayments(1L, 42L, true)).isEmpty();
    }

    @Test
    void anotherCustomerCannotCancelOrPayOrder() {
        var order = orders.findById(1L);
        when(orders.findByIdForUpdate(1L)).thenReturn(order);
        assertThatThrownBy(() -> orderService.cancelByCustomer(42L, 1L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> paymentService.createPayment(42L, 1L, null)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(payments, inventory);
    }
}

