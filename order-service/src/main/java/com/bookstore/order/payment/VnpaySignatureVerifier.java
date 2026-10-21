package com.bookstore.order.payment;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;

@Component
@ConditionalOnProperty(name = "payments.vnpay.enabled", havingValue = "true")
public class VnpaySignatureVerifier {
    private final byte[] secret;
    private final String tmnCode;

    public VnpaySignatureVerifier(@Value("${payments.vnpay.hash-secret}") String secret,
                                  @Value("${payments.vnpay.tmn-code}") String tmnCode) {
        if (secret.isBlank() || tmnCode.isBlank()) {
            throw new IllegalArgumentException("VNPAY_HASH_SECRET and VNPAY_TMN_CODE are required when VNPAY is enabled");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.tmnCode = tmnCode;
    }

    public boolean verify(MultiValueMap<String, String> parameters) {
        if (parameters.size() > 40 || parameters.entrySet().stream().anyMatch(entry ->
                !entry.getKey().matches("vnp_[A-Za-z0-9]{1,60}") || entry.getValue().size() != 1
                || entry.getValue().get(0) == null || entry.getValue().get(0).length() > 1024)) return false;
        String signature = parameters.getFirst("vnp_SecureHash");
        if (signature == null || !signature.matches("[0-9a-fA-F]{128}")) return false;
        String hashType = parameters.getFirst("vnp_SecureHashType");
        if (hashType != null && !hashType.equalsIgnoreCase("HmacSHA512")) return false;
        var fields = new TreeMap<String, String>();
        parameters.forEach((name, values) -> {
            if (!name.equals("vnp_SecureHash") && !name.equals("vnp_SecureHashType") && !values.get(0).isEmpty()) {
                fields.put(name, values.get(0));
            }
        });
        String data = fields.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret, "HmacSHA512"));
            return MessageDigest.isEqual(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)),
                    HexFormat.of().parseHex(signature));
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("HmacSHA512 is unavailable", error);
        }
    }

    public boolean matchesMerchant(String merchant) { return tmnCode.equals(merchant); }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

