package com.bookstore.order.service;

import com.bookstore.order.client.*;
import com.bookstore.order.dto.*;
import com.bookstore.order.entity.*;
import com.bookstore.order.enums.OrderStatus;
import com.bookstore.order.exception.BadRequestException;
import com.bookstore.order.exception.ResourceNotFoundException;
import com.bookstore.order.repository.CartRepository;
import com.bookstore.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;


@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final CatalogClient catalogClient;
    private final InventoryClient inventoryClient;
    private final OrderTransitionCoordinator transitionCoordinator;

    @Transactional
    public OrderResponse placeOrder(Long userId, PlaceOrderRequest req) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Giỏ hàng trống"));
        if (cart.getItems().isEmpty()) throw new BadRequestException("Giỏ hàng trống");

        Order order = new Order();
        order.setUserId(userId);
        order.setShippingAddress(req.shippingAddress());
        order.setPaymentMethod(req.paymentMethod());

        BigDecimal total = BigDecimal.ZERO;
        for (CartItem ci : cart.getItems()) {
            BookInfo book = catalogClient.getBook(ci.getBookId());
            inventoryClient.checkStock(ci.getBookId(), ci.getQuantity());

            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setBookId(book.id());
            oi.setBookTitle(book.title());
            oi.setQuantity(ci.getQuantity());
            oi.setUnitPrice(book.price());
            order.getItems().add(oi);

            total = total.add(book.price().multiply(BigDecimal.valueOf(ci.getQuantity())));
        }
        order.setTotalAmount(total);
        Order saved = orderRepository.save(order);

        cart.getItems().clear();
        cartRepository.save(cart);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders(OrderStatus status) {
        List<Order> orders = (status == null)
                ? orderRepository.findAllByOrderByCreatedAtDesc()
                : orderRepository.findByOrderStatusOrderByCreatedAtDesc(status);
        return orders.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long orderId, Long userId, boolean canManageOrders) {
        Order order = findOrder(orderId);
        if (!canManageOrders && !order.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng " + orderId);
        }
        return toResponse(order);
    }

    public OrderResponse updateStatus(Long orderId, OrderStatus newStatus) {
        return toResponse(transitionCoordinator.change(orderId, newStatus, null));
    }

    public OrderResponse cancelByCustomer(Long userId, Long orderId) {
        return toResponse(transitionCoordinator.change(orderId, OrderStatus.CANCELLED, userId));
    }

    // ---------- helpers ----------

    private Order findOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng " + orderId));
    }

    private OrderResponse toResponse(Order o) {
        List<OrderItemResponse> items = o.getItems().stream().map(i -> new OrderItemResponse(
                i.getBookId(), i.getBookTitle(), i.getQuantity(), i.getUnitPrice(),
                i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))).toList();
        return new OrderResponse(o.getId(), o.getUserId(), o.getShippingAddress(), o.getTotalAmount(),
                o.getOrderStatus(), o.getPaymentMethod(), o.getPaymentStatus(), o.getCreatedAt(), items);
    }
}
