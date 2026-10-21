package com.bookstore.order.service;

import com.bookstore.order.entity.OrderTransition.State;
import com.bookstore.order.repository.OrderTransitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.LocalDateTime;

@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(name = "orders.recovery.enabled", havingValue = "true", matchIfMissing = true)
public class OrderTransitionRecovery {
    private final OrderTransitionRepository transitions;
    private final OrderTransitionCoordinator coordinator;

    @Scheduled(fixedDelayString = "${orders.recovery.delay-ms:10000}",
            initialDelayString = "${orders.recovery.delay-ms:10000}")
    public void retryPending() {
        for (var intent : transitions.findTop100ByStateAndNextAttemptAtLessThanEqualOrderByIdAsc(
                State.PENDING, LocalDateTime.now())) {
            try {
                coordinator.process(intent.getId());
            } catch (RuntimeException failure) {
                log.warn("Order transition {} pending recovery ({})", intent.getId(), failure.getClass().getSimpleName());
            }
        }
    }
}
