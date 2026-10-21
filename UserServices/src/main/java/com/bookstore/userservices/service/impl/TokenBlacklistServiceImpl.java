package com.bookstore.userservices.service.impl;

import com.bookstore.userservices.service.TokenBlacklistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cài đặt TokenBlacklistService sử dụng Redis phân tán.
 * Có cơ chế dự phòng bộ nhớ đệm nội bộ (In-Memory Fallback) khi kết nối Redis gặp sự cố.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistServiceImpl implements TokenBlacklistService {

    private static final String BLACKLIST_KEY_PREFIX = "token:blacklist:";

    private final StringRedisTemplate stringRedisTemplate;

    // Bộ nhớ dự phòng nếu Redis tạm thời mất kết nối (lưu token -> thời gian hết hạn ms)
    private final Map<String, Long> localFallbackBlacklist = new ConcurrentHashMap<>();

    @Override
    public void blacklistToken(String token, long expirationMillis) {
        if (token == null || expirationMillis <= 0) {
            return;
        }

        String key = BLACKLIST_KEY_PREFIX + token;
        try {
            stringRedisTemplate.opsForValue().set(key, "revoked", Duration.ofMillis(expirationMillis));
            log.info("Token đã được đưa vào Redis Blacklist với TTL: {} ms", expirationMillis);
        } catch (Exception e) {
            log.warn("Không thể kết nối Redis để lưu blacklist, sử dụng bộ nhớ nội bộ dự phòng: {}", e.getMessage());
            localFallbackBlacklist.put(token, System.currentTimeMillis() + expirationMillis);
        }
    }

    @Override
    public boolean isBlacklisted(String token) {
        if (token == null) {
            return false;
        }

        String key = BLACKLIST_KEY_PREFIX + token;
        try {
            Boolean exists = stringRedisTemplate.hasKey(key);
            if (Boolean.TRUE.equals(exists)) {
                return true;
            }
        } catch (Exception e) {
            log.warn("Lỗi kiểm tra Redis Blacklist, kiểm tra bộ nhớ dự phòng: {}", e.getMessage());
        }

        // Kiểm tra trong bộ nhớ dự phòng (loại bỏ các token đã hết hạn)
        Long expiryTime = localFallbackBlacklist.get(token);
        if (expiryTime != null) {
            if (System.currentTimeMillis() < expiryTime) {
                return true;
            } else {
                localFallbackBlacklist.remove(token);
            }
        }

        return false;
    }
}
