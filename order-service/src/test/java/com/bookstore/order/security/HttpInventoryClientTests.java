package com.bookstore.order.security;

import com.bookstore.order.client.HttpInventoryClient;
import com.bookstore.order.client.StockItem;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class HttpInventoryClientTests {
    private record Request(String method, String path, String authorization) {}

    @Test
    void sendsSignedServiceCredentialsForEveryInventoryCall() throws Exception {
        var requests = Collections.synchronizedList(new ArrayList<Request>());
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/internal/inventory", exchange -> {
            requests.add(new Request(exchange.getRequestMethod(), exchange.getRequestURI().getPath(),
                    exchange.getRequestHeaders().getFirst("Authorization")));
            exchange.getRequestBody().readAllBytes();
            if (exchange.getRequestMethod().equals("GET")) {
                byte[] body = "{\"bookId\":1,\"quantity\":10}".getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
            } else {
                exchange.sendResponseHeaders(204, -1);
            }
            exchange.close();
        });
        server.start();
        try {
            var tokens = new InventoryServiceToken(TestTokens.SERVICE_KEY);
            var client = new HttpInventoryClient("http://127.0.0.1:" + server.getAddress().getPort(), tokens);
            client.checkStock(1L, 2);
            client.deduct(4L, List.of(new StockItem(1L, 2)));
            client.restore(4L, List.of(new StockItem(1L, 2)));
            assertThat(requests).extracting(Request::path).containsExactly("/internal/inventory/1",
                    "/internal/inventory/orders/4/deduct", "/internal/inventory/orders/4/restore");
            Set<String> ids = new HashSet<>();
            for (Request request : requests) {
                assertThat(request.authorization()).startsWith("Bearer ");
                var jwt = SignedJWT.parse(request.authorization().substring(7));
                assertThat(jwt.verify(new MACVerifier(Base64.getDecoder().decode(TestTokens.SERVICE_KEY)))).isTrue();
                assertThat(jwt.verify(new MACVerifier(Base64.getDecoder().decode(TestTokens.USER_KEY)))).isFalse();
                var claims = jwt.getJWTClaimsSet();
                assertThat(claims.getIssuer()).isEqualTo("order-service");
                assertThat(claims.getSubject()).isEqualTo("order-service");
                assertThat(claims.getAudience()).containsExactly("inventory-service");
                assertThat(claims.getStringClaim("type")).isEqualTo("service");
                assertThat(claims.getStringClaim("scope")).isEqualTo(request.method().equals("GET")
                        ? "inventory.read" : "inventory.write");
                assertThat(claims.getExpirationTime().toInstant()).isAfter(Instant.now());
                assertThat(claims.getExpirationTime().getTime() - claims.getIssueTime().getTime()).isEqualTo(60000);
                ids.add(claims.getJWTID());
            }
            assertThat(ids).hasSize(3);
        } finally {
            server.stop(0);
        }
    }

    @Test
    void refusesWeakOrInvalidServiceSecrets() {
        assertThatThrownBy(() -> new InventoryServiceToken("not-base64"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new InventoryServiceToken("c2hvcnQ="))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
