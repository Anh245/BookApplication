package com.bookstore.order.repository;

import com.bookstore.order.entity.OrderTransition;
import com.bookstore.order.entity.OrderTransition.State;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderTransitionRepository extends JpaRepository<OrderTransition, Long> {
    @Query("select t.orderId from OrderTransition t where t.id = :id")
    Optional<Long> findOrderId(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from OrderTransition t where t.id = :id")
    Optional<OrderTransition> findByIdForUpdate(@Param("id") Long id);
    Optional<OrderTransition> findByOrderIdAndState(Long orderId, State state);
    List<OrderTransition> findTop100ByStateAndNextAttemptAtLessThanEqualOrderByIdAsc(
            State state, LocalDateTime now);
}
