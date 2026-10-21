package com.bookstore.order.service;

import com.bookstore.order.client.InventoryClient;
import com.bookstore.order.client.StockItem;
import com.bookstore.order.entity.Order;
import com.bookstore.order.entity.OrderTransition;
import com.bookstore.order.enums.OrderStatus;
import com.bookstore.order.exception.BadRequestException;
import com.bookstore.order.exception.ResourceNotFoundException;
import com.bookstore.order.exception.ServiceUnavailableException;
import com.bookstore.order.repository.OrderRepository;
import com.bookstore.order.repository.OrderTransitionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import static com.bookstore.order.entity.OrderTransition.State.COMPLETED;
import static com.bookstore.order.entity.OrderTransition.State.REJECTED;
import static com.bookstore.order.enums.OrderStatus.*;

@Slf4j
@Service
public class OrderTransitionCoordinator {
    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED), CONFIRMED, Set.of(PREPARING, CANCELLED),
            PREPARING, Set.of(SHIPPING, CANCELLED), SHIPPING, Set.of(DELIVERED),
            DELIVERED, Set.of(RETURNED), CANCELLED, Set.of(), RETURNED, Set.of());

    private final OrderRepository orders;
    private final OrderTransitionRepository transitions;
    private final InventoryClient inventory;
    private final PaymentService payments;
    private final TransactionTemplate transaction;

    public OrderTransitionCoordinator(OrderRepository orders, OrderTransitionRepository transitions,
            InventoryClient inventory, PaymentService payments, PlatformTransactionManager manager) {
        this.orders = orders;
        this.transitions = transitions;
        this.inventory = inventory;
        this.payments = payments;
        transaction = new TransactionTemplate(manager);
        // The durable intent must commit before any remote effect, even if called in an outer transaction.
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public Order change(Long orderId, OrderStatus target, Long customerId) {
        Long transitionId = transaction.execute(status -> {
            Order order = lockOrder(orderId);
            if (customerId != null && !order.getUserId().equals(customerId)) {
                throw new ResourceNotFoundException("Không tìm thấy đơn hàng " + orderId);
            }
            if (customerId != null && order.getOrderStatus() != PENDING && order.getOrderStatus() != CONFIRMED) {
                throw new BadRequestException("Chỉ hủy được đơn đang chờ xác nhận hoặc đã xác nhận");
            }
            var pending = transitions.findByOrderIdAndState(orderId, OrderTransition.State.PENDING);
            if (pending.isPresent()) {
                if (pending.get().getTargetStatus() == target) return pending.get().getId();
                throw new ServiceUnavailableException("Đơn đang đồng bộ tồn kho; vui lòng thử lại sau");
            }
            if (!TRANSITIONS.get(order.getOrderStatus()).contains(target)) {
                throw new BadRequestException("Không thể chuyển đơn từ " + order.getOrderStatus() + " sang " + target);
            }
            OrderTransition intent = new OrderTransition();
            intent.setOrderId(orderId);
            intent.setSourceStatus(order.getOrderStatus());
            intent.setTargetStatus(target);
            return transitions.save(intent).getId();
        });
        return process(transitionId);
    }

    public Order process(Long transitionId) {
        try {
            Outcome outcome = transaction.execute(status -> {
                // Scalar lookup: never cache an unlocked Order before taking its row lock.
                Long orderId = transitions.findOrderId(transitionId).orElseThrow();
                Order order = lockOrder(orderId);
                // Read the intent only after the order lock; another worker may have completed it.
                OrderTransition intent = transitions.findByIdForUpdate(transitionId).orElseThrow();
                order.getItems().size();
                if (intent.getState() == COMPLETED) return new Outcome(order, null);
                if (intent.getState() == REJECTED) {
                    return new Outcome(order, new BadRequestException("Thao tác kho đã bị từ chối"));
                }
                if (order.getOrderStatus() != intent.getSourceStatus()) {
                    throw new IllegalStateException("Order status differs from pending transition");
                }
                var items = order.getItems().stream()
                        .map(item -> new StockItem(item.getBookId(), item.getQuantity())).toList();
                try {
                    if (intent.getTargetStatus() == CONFIRMED) inventory.deduct(orderId, items);
                    else if ((intent.getTargetStatus() == CANCELLED || intent.getTargetStatus() == RETURNED)
                            && intent.getSourceStatus() != PENDING) inventory.restore(orderId, items);
                } catch (BadRequestException rejected) {
                    // Inventory's atomic 400 means no stock mutation committed; this intent is terminal.
                    intent.setState(REJECTED);
                    return new Outcome(order, rejected);
                }
                if (intent.getTargetStatus() == CANCELLED || intent.getTargetStatus() == RETURNED) {
                    payments.onOrderClosed(order);
                } else if (intent.getTargetStatus() == DELIVERED) payments.onOrderDelivered(order);
                order.setOrderStatus(intent.getTargetStatus());
                orders.save(order);
                intent.setState(COMPLETED);
                return new Outcome(order, null);
            });
            if (outcome.rejection() != null) throw outcome.rejection();
            return outcome.order();
        } catch (RuntimeException failure) {
            deferRetry(transitionId);
            throw failure;
        }
    }

    private void deferRetry(Long transitionId) {
        try {
            transaction.executeWithoutResult(status -> {
                Long orderId = transitions.findOrderId(transitionId).orElseThrow();
                lockOrder(orderId);
                OrderTransition intent = transitions.findByIdForUpdate(transitionId).orElseThrow();
                if (intent.getState() == OrderTransition.State.PENDING) {
                    intent.setNextAttemptAt(LocalDateTime.now().plusSeconds(30));
                }
            });
        } catch (RuntimeException unavailable) {
            // The original committed intent remains recoverable even when this backoff update fails.
            log.warn("Could not defer order transition {} ({})", transitionId, unavailable.getClass().getSimpleName());
        }
    }

    private Order lockOrder(Long orderId) {
        return orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng " + orderId));
    }

    private record Outcome(Order order, BadRequestException rejection) {}
}
