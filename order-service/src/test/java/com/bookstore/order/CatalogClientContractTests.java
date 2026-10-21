package com.bookstore.order;

import com.bookstore.order.client.HttpCatalogClient;
import com.bookstore.order.exception.ResourceNotFoundException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.CopyOnWriteArrayList;
import static org.assertj.core.api.Assertions.*;

class CatalogClientContractTests {
    @Test
    void realClientReadsTheSharedCatalogContractWithoutMockProfile() throws Exception {
        Properties contract = new Properties();
        try (var input = getClass().getResourceAsStream("/contracts/catalog/book-by-id.properties")) {
            contract.load(input);
        }
        byte[] payload;
        try (var input = getClass().getResourceAsStream("/contracts/catalog/book-by-id.json")) {
            payload = input.readAllBytes();
        }
        var paths = new CopyOnWriteArrayList<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            paths.add(exchange.getRequestURI().getPath());
            boolean matches = exchange.getRequestMethod().equals(contract.getProperty("request.method"))
                    && exchange.getRequestURI().getPath().equals(contract.getProperty("request.path"));
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            byte[] body = matches ? payload : "{}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(matches ? Integer.parseInt(contract.getProperty("response.status")) : 404, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles("integration");
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("catalog-test", Map.of(
                    "catalog.base-url", "http://127.0.0.1:" + server.getAddress().getPort())));
            context.register(HttpCatalogClient.class);
            context.refresh();
            var client = context.getBean(HttpCatalogClient.class);
            var book = client.getBook(Long.parseLong(contract.getProperty("book.id")));
            assertThat(book.id()).isEqualTo(42L);
            assertThat(book.title()).isEqualTo(contract.getProperty("book.title"));
            assertThat(book.price()).isEqualByComparingTo(new BigDecimal(contract.getProperty("book.price")));
            assertThat(paths).containsExactly(contract.getProperty("request.path"));
            assertThatThrownBy(() -> client.getBook(99L)).isInstanceOf(ResourceNotFoundException.class);
        } finally { server.stop(0); }
    }
}
