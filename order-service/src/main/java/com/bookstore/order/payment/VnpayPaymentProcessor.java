package com.bookstore.order.payment;

import com.bookstore.order.enums.*;
import com.bookstore.order.repository.*;
import java.time.LocalDateTime;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "payments.vnpay.enabled", havingValue = "true")
public class VnpayPaymentProcessor {
    private final PaymentRepository payments;
    private final OrderRepository orders;

    public VnpayPaymentProcessor(PaymentRepository payments, OrderRepository orders) {
        this.payments = payments;
        this.orders = orders;
    }

    @Transactional
    public VnpayIpnResponse process(VnpayNotification notification) {
        // Scalar lookup avoids caching an unlocked payment entity before acquiring the order lock.
        var orderId = payments.findOrderIdByTransactionRef(notification.transactionRef());
        if (orderId.isEmpty()) return VnpayIpnResponse.of("01");
        var foundOrder = orders.findByIdForUpdate(orderId.get());
        if (foundOrder.isEmpty()) return VnpayIpnResponse.of("01");
        var foundPayment = payments.findByTransactionRefForUpdate(notification.transactionRef());
        if (foundPayment.isEmpty()) return VnpayIpnResponse.of("01");
        var payment = foundPayment.get();
        var order = foundOrder.get();
        if (payment.getMethod() != PaymentMethod.VNPAY) return VnpayIpnResponse.of("01");
        if (!payment.getAmount().movePointRight(2).toBigIntegerExact().equals(notification.amount())
                || !order.getTotalAmount().movePointRight(2).toBigIntegerExact().equals(notification.amount())) {
            return VnpayIpnResponse.of("04");
        }
        if (payment.getStatus() != PaymentStatus.PENDING || order.getPaymentStatus() == PaymentStatus.PAID
                || order.getPaymentStatus() == PaymentStatus.REFUNDED
                || order.getOrderStatus() == OrderStatus.CANCELLED || order.getOrderStatus() == OrderStatus.RETURNED) {
            return VnpayIpnResponse.of("02");
        }
        if (notification.successful()) {
            if (payments.existsByVnpayTransactionNo(notification.transactionNo())) return VnpayIpnResponse.of("02");
            payment.setVnpayTransactionNo(notification.transactionNo());
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            order.setPaymentStatus(PaymentStatus.PAID);
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            order.setPaymentStatus(PaymentStatus.FAILED);
        }
        payments.flush(); // Unique provider transaction number also protects against cross-order races.
        return VnpayIpnResponse.of("00");
    }
}

