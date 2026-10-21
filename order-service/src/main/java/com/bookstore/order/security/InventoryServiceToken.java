package com.bookstore.order.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "inventory.mock", havingValue = "false", matchIfMissing = true)
public class InventoryServiceToken {
    private final JwtEncoder encoder;
    private final MacAlgorithm algorithm;

    public InventoryServiceToken(@Value("${inventory.service-jwt.secret}") String secret) {
        var key = JwtTokens.key(secret);
        encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        algorithm = switch (key.getAlgorithm()) {
            case "HmacSHA512" -> MacAlgorithm.HS512;
            case "HmacSHA384" -> MacAlgorithm.HS384;
            default -> MacAlgorithm.HS256;
        };
    }

    public String readToken() { return token("inventory.read"); }
    public String writeToken() { return token("inventory.write"); }

    private String token(String scope) {
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer("order-service").subject("order-service")
                .audience(List.of("inventory-service")).issuedAt(now).expiresAt(now.plusSeconds(60))
                .id(UUID.randomUUID().toString()).claim("type", "service").claim("scope", scope).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(algorithm).build(), claims)).getTokenValue();
    }
}
