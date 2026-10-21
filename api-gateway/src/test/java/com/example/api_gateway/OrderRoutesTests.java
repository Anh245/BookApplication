package com.example.api_gateway;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "eureka.client.enabled=false")
class OrderRoutesTests {
    static final HttpServer backend = startBackend();
    @LocalServerPort int port;
    final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    @DynamicPropertySource
    static void discovery(DynamicPropertyRegistry properties) {
        properties.add("spring.cloud.discovery.client.simple.instances.order-service[0].uri",
                () -> "http://127.0.0.1:" + backend.getAddress().getPort());
    }

    @AfterAll static void stopBackend() { backend.stop(0); }

    @ParameterizedTest
    @ValueSource(strings = {"/api/orders", "/api/orders/my", "/api/orders/12", "/api/orders/12/payments",
            "/api/cart", "/api/cart/items/3", "/api/payments/vnpay/ipn?vnp_TxnRef=TXN-12&vnp_Amount=10000"})
    void forwardsCurrentApiWithoutChangingPathOrQuery(String path) throws Exception {
        var response = send("GET", path, "");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("GET " + path + "|Bearer fixture-access-token|");
    }

    @Test
    void forwardsMutationMethodAuthorizationAndBody() throws Exception {
        var response = send("PATCH", "/api/orders/12/status", "{\"status\":\"CONFIRMED\"}");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("PATCH /api/orders/12/status|Bearer fixture-access-token|{\"status\":\"CONFIRMED\"}");
    }

    @Test
    void legacyOrderAliasAddsTheApiPrefix() throws Exception {
        var response = send("GET", "/orders/12?size=5", "");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("GET /api/orders/12?size=5|Bearer fixture-access-token|");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/internal/inventory/orders/12/deduct", "/internal/ai/purchases", "/api/orders-other/12"})
    void doesNotExposeInternalOrUnrelatedRoutes(String path) throws Exception {
        assertThat(send("GET", path, "").statusCode()).isEqualTo(404);
    }

    private HttpResponse<String> send(String method, String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(5)).header("Authorization", "Bearer fixture-access-token")
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private static HttpServer startBackend() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                byte[] echo = (exchange.getRequestMethod() + " " + exchange.getRequestURI()
                        + "|" + exchange.getRequestHeaders().getFirst("Authorization") + "|" + body)
                        .getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, echo.length);
                exchange.getResponseBody().write(echo);
                exchange.close();
            });
            server.start();
            return server;
        } catch (java.io.IOException error) { throw new IllegalStateException(error); }
    }
}
