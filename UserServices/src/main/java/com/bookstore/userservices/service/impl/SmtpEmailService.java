package com.bookstore.userservices.service.impl;

import com.bookstore.userservices.exception.AppException;
import com.bookstore.userservices.service.EmailService;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Profile("!dev | prod | production")
public class SmtpEmailService implements EmailService {
    private final JavaMailSender sender;
    private final String from;
    private final long expirationMinutes;

    public SmtpEmailService(JavaMailSender sender,
            @Value("${application.mail.from:}") String from,
            @Value("${spring.mail.host:}") String host,
            @Value("${application.security.otp.expiration-minutes:5}") long expirationMinutes) {
        if (host.isBlank() || !validAddress(from) || expirationMinutes <= 0) {
            throw new IllegalArgumentException("SMTP_HOST, SMTP_FROM và hạn OTP hợp lệ là bắt buộc ngoài profile dev");
        }
        this.sender = sender;
        this.from = from;
        this.expirationMinutes = expirationMinutes;
    }

    @Override
    public void sendOtpEmail(String toEmail, String otp) {
        if (!validAddress(toEmail) || otp == null || !otp.matches("[0-9]{6}")) {
            throw new IllegalArgumentException("Thông tin gửi email khôi phục không hợp lệ");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(toEmail);
        message.setSubject("[BookStore] Mã xác thực khôi phục mật khẩu");
        message.setText("Mã xác thực khôi phục mật khẩu của bạn là: " + otp
                + "\nMã có hiệu lực trong " + expirationMinutes + " phút."
                + "\nKhông chia sẻ mã này với người khác. Nếu không yêu cầu khôi phục, hãy bỏ qua email.");
        try {
            sender.send(message);
        } catch (MailException unavailable) {
            // SMTP exceptions can contain message bodies or credentials. Do not log or expose them.
            throw new AppException("Không gửi được email khôi phục. Vui lòng thử lại sau", HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    private static boolean validAddress(String address) {
        if (address == null || address.isBlank() || address.contains("\r") || address.contains("\n")) return false;
        try {
            InternetAddress parsed = new InternetAddress(address, true);
            parsed.validate();
            return parsed.getAddress().equals(address);
        } catch (AddressException invalid) {
            return false;
        }
    }
}
