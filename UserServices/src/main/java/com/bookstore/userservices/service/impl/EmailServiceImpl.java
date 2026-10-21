package com.bookstore.userservices.service.impl;

import com.bookstore.userservices.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Profile;

/**
 * Cài đặt EmailService mô phỏng gửi email thông báo và mã OTP.
 * Chỉ bật khi phát triển; không ghi mã khôi phục hoặc nội dung email vào log.
 */
@Service
@Slf4j
@Profile("dev & !prod & !production")
public class EmailServiceImpl implements EmailService {

    @Override
    public void sendOtpEmail(String toEmail, String otp) {
        log.debug("Email khôi phục đang được giả lập trong profile dev");
    }
}
