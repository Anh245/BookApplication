package com.bookstore.order.entity;

import com.bookstore.order.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_transitions", indexes = {
        @Index(name = "ix_order_transition_recovery", columnList = "state,next_attempt_at"),
        @Index(name = "ix_order_transition_order", columnList = "order_id,state")})
@Getter @Setter @NoArgsConstructor
public class OrderTransition {
    public enum State { PENDING, COMPLETED, REJECTED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transition_id")
    private Long id;
    @Column(name = "order_id", nullable = false)
    private Long orderId;
    @Enumerated(EnumType.STRING)
    @Column(name = "source_status", nullable = false)
    private OrderStatus sourceStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "target_status", nullable = false)
    private OrderStatus targetStatus;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private State state = State.PENDING;
    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt = LocalDateTime.now();
}
