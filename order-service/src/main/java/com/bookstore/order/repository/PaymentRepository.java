package com.bookstore.order.repository;

import com.bookstore.order.entity.Payment;
import com.bookstore.order.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @Query("select p.order.id from Payment p where p.transactionRef = :ref")
    Optional<Long> findOrderIdByTransactionRef(@Param("ref") String ref);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.transactionRef = :ref")
    Optional<Payment> findByTransactionRefForUpdate(@Param("ref") String ref);

    boolean existsByVnpayTransactionNo(String transactionNo);
    List<Payment> findByOrderIdOrderByCreatedAtDesc(Long orderId);
    Optional<Payment> findByTransactionRef(String transactionRef);
    Optional<Payment> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(Long orderId, PaymentStatus status);
}
