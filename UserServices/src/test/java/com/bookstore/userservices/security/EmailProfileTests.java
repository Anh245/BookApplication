package com.bookstore.userservices.security;

import com.bookstore.userservices.service.EmailService;
import com.bookstore.userservices.service.impl.EmailServiceImpl;
import com.bookstore.userservices.service.impl.SmtpEmailService;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import static org.assertj.core.api.Assertions.*;

class EmailProfileTests {
    @Test
    void simulatorRequiresExplicitDevelopmentProfile() {
        for (String[] profiles : new String[][] { {}, {"prod"}, {"production"}, {"test"}, {"dev", "prod"}, {"dev", "production"} }) {
            try (var context = new AnnotationConfigApplicationContext()) {
                context.getEnvironment().setActiveProfiles(profiles);
                context.register(EmailServiceImpl.class);
                context.refresh();
                assertThat(context.getBeansOfType(EmailService.class)).as("profiles %s", (Object) profiles).isEmpty();
            }
        }
    }

    @Test
    void developmentSimulatorDoesNotLogOtp() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles("dev");
            context.register(EmailServiceImpl.class, SmtpEmailService.class);
            context.refresh();
            assertThat(context.getBeansOfType(EmailService.class)).hasSize(1);
            assertThat(context.getBean(EmailService.class)).isInstanceOf(EmailServiceImpl.class);
            Logger logger = (Logger) LoggerFactory.getLogger(EmailServiceImpl.class);
            Level previous = logger.getLevel();
            logger.setLevel(Level.TRACE);
            ListAppender<ILoggingEvent> captured = new ListAppender<>();
            captured.start();
            logger.addAppender(captured);
            try {
                context.getBean(EmailService.class).sendOtpEmail("recipient@example.test", "918273");
                assertThat(captured.list).allMatch(event -> !event.getFormattedMessage().contains("918273"));
            } finally { logger.detachAppender(captured); logger.setLevel(previous); captured.stop(); }
        }
    }
}
