package com.bookstore.userservices.security;

import com.bookstore.userservices.service.EmailService;
import com.bookstore.userservices.service.impl.EmailServiceImpl;
import com.bookstore.userservices.service.impl.SmtpEmailService;
import com.bookstore.userservices.exception.AppException;
import com.bookstore.userservices.exception.GlobalExceptionHandler;
import com.bookstore.userservices.controller.AuthController;
import com.bookstore.userservices.service.AuthService;
import com.bookstore.userservices.service.AuthSessionService;
import com.bookstore.userservices.service.OtpService;
import com.bookstore.userservices.service.RateLimitService;
import com.bookstore.userservices.service.TokenBlacklistService;
import com.bookstore.userservices.service.impl.AuthServiceImpl;
import com.bookstore.userservices.repository.UserRepository;
import com.bookstore.userservices.repository.RoleRepository;
import com.bookstore.userservices.entity.User;
import com.bookstore.userservices.entity.UserStatus;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SmtpEmailTests {
    @Test
    void realSenderIsSelectedOutsideDevIncludingMixedProductionProfiles() {
        for (String[] profiles : new String[][] { {}, {"prod"}, {"production"}, {"test"}, {"dev", "prod"}, {"dev", "production"} }) {
            try (var context = new AnnotationConfigApplicationContext()) {
                context.getEnvironment().setActiveProfiles(profiles);
                context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test-mail", Map.of(
                        "application.mail.from", "sender@example.test", "spring.mail.host", "smtp.example.test")));
                context.registerBean(JavaMailSender.class, () -> mock(JavaMailSender.class));
                context.register(EmailServiceImpl.class, SmtpEmailService.class);
                context.refresh();
                assertThat(context.getBeansOfType(EmailService.class)).hasSize(1);
                assertThat(context.getBean(EmailService.class)).isInstanceOf(SmtpEmailService.class);
            }
        }
    }

    @Test
    void missingOrInvalidProductionConfigurationFailsBeforeSending() {
        JavaMailSender sender = mock(JavaMailSender.class);
        assertThatThrownBy(() -> new SmtpEmailService(sender, "", "smtp.example.test", 5))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SmtpEmailService(sender, "sender@example.test", "", 5))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SmtpEmailService(sender, "sender@example.test\r\nBcc: other@example.test", "smtp.example.test", 5))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(sender);
    }

    @Test
    void smtpFailureReturns503WithoutLeakingOtpOrTransportDetails() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        doThrow(new MailSendException("SMTP raw payload 918273 secret-password"))
                .when(sender).send(any(SimpleMailMessage.class));
        var email = new SmtpEmailService(sender, "sender@example.test", "smtp.example.test", 5);
        UserRepository users = mock(UserRepository.class);
        OtpService otp = mock(OtpService.class);
        when(users.findByEmail("recipient@example.test")).thenReturn(Optional.of(User.builder()
                .email("recipient@example.test").status(UserStatus.ACTIVE).build()));
        when(otp.generateOtp("recipient@example.test")).thenReturn("918273");
        AuthService auth = new AuthServiceImpl(users, mock(RoleRepository.class), mock(PasswordEncoder.class),
                mock(AuthSessionService.class), mock(RateLimitService.class), mock(TokenBlacklistService.class), otp, email);
        var mvc = MockMvcBuilders.standaloneSetup(new AuthController(auth))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        var response = mvc.perform(post("/api/auth/forgot-password").contentType("application/json")
                .content("{\"email\":\"recipient@example.test\"}"))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.success").value(false))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("918273", "secret-password", "SMTP raw payload");
    }

    @Test
    void invalidRecipientCannotInjectHeaders() {
        JavaMailSender sender = mock(JavaMailSender.class);
        var email = new SmtpEmailService(sender, "sender@example.test", "smtp.example.test", 5);
        assertThatThrownBy(() -> email.sendOtpEmail("recipient@example.test\r\nBcc: other@example.test", "918273"))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(sender);
    }

    @Test
    void realSmtpTransportDeliversUtf8MessageToLoopbackServer() throws Exception {
        try (ServerSocket server = new ServerSocket(0, 1, InetAddress.getLoopbackAddress());
             ExecutorService executor = Executors.newSingleThreadExecutor()) {
            server.setSoTimeout(5000);
            Future<MimeMessage> delivered = executor.submit(() -> receive(server));
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(server.getInetAddress().getHostAddress());
            sender.setPort(server.getLocalPort());
            sender.setDefaultEncoding("UTF-8");
            sender.getJavaMailProperties().setProperty("mail.smtp.connectiontimeout", "2000");
            sender.getJavaMailProperties().setProperty("mail.smtp.timeout", "2000");
            sender.getJavaMailProperties().setProperty("mail.smtp.writetimeout", "2000");
            new SmtpEmailService(sender, "sender@example.test", "localhost", 7)
                    .sendOtpEmail("recipient@example.test", "918273");
            MimeMessage message = delivered.get(5, TimeUnit.SECONDS);
            assertThat(message.getSubject()).contains("khôi phục mật khẩu");
            assertThat(message.getFrom()[0].toString()).isEqualTo("sender@example.test");
            assertThat(message.getAllRecipients()[0].toString()).isEqualTo("recipient@example.test");
            assertThat(message.getContent().toString()).contains("918273", "7 phút", "Không chia sẻ");
        }
    }

    private MimeMessage receive(ServerSocket server) throws Exception {
        try (Socket socket = server.accept()) {
            socket.setSoTimeout(5000);
            var input = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.ISO_8859_1));
            var output = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.US_ASCII), true);
            output.print("220 localhost ESMTP\r\n"); output.flush();
            StringBuilder raw = new StringBuilder();
            String line;
            boolean data = false;
            while ((line = input.readLine()) != null) {
                if (data) {
                    if (line.equals(".")) { data = false; output.print("250 Accepted\r\n"); }
                    else raw.append(line.startsWith("..") ? line.substring(1) : line).append("\r\n");
                } else if (line.startsWith("EHLO")) output.print("250-localhost\r\n250 8BITMIME\r\n");
                else if (line.equals("DATA")) { data = true; output.print("354 Send data\r\n"); }
                else if (line.equals("QUIT")) { output.print("221 Bye\r\n"); output.flush(); break; }
                else output.print("250 OK\r\n");
                output.flush();
            }
            return new MimeMessage(Session.getInstance(new Properties()),
                    new ByteArrayInputStream(raw.toString().getBytes(StandardCharsets.ISO_8859_1)));
        }
    }
}
