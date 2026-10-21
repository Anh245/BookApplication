package com.bookstore.userservices.security;

import com.bookstore.userservices.service.impl.OtpServiceImpl;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.Duration;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class OtpLoggingTests {
    @Test
    @SuppressWarnings("unchecked")
    void redisFailuresDoNotLogOtpEvenWhenExceptionContainsIt() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        doAnswer(call -> { throw new IllegalStateException("Redis SET payload: " + call.getArgument(1)); })
                .when(values).set(anyString(), anyString(), any(Duration.class));
        var service = new OtpServiceImpl(redis);
        ReflectionTestUtils.setField(service, "otpExpirationMinutes", 5L);
        Logger logger = (Logger) LoggerFactory.getLogger(OtpServiceImpl.class);
        Level previous = logger.getLevel();
        logger.setLevel(Level.TRACE);
        var captured = new ListAppender<ILoggingEvent>();
        captured.start(); logger.addAppender(captured);
        try {
            String code = service.generateOtp("recipient@example.test");
            when(values.get(anyString())).thenThrow(new IllegalStateException("Redis GET payload: " + code));
            doThrow(new IllegalStateException("Redis DELETE payload: " + code)).when(redis).delete(anyString());
            assertThat(service.verifyOtp("recipient@example.test", code)).isTrue();
            service.clearOtp("recipient@example.test");
            assertThat(service.verifyOtp("recipient@example.test", code)).isFalse();
            assertThat(captured.list).isNotEmpty().allMatch(event -> !event.getFormattedMessage().contains(code)
                    && event.getThrowableProxy() == null);
        } finally {
            logger.detachAppender(captured); logger.setLevel(previous); captured.stop();
        }
    }
}
