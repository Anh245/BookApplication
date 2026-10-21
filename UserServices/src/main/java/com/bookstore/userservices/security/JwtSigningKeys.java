package com.bookstore.userservices.security;

import java.nio.file.*;
import java.security.*;
import java.security.interfaces.*;
import java.security.spec.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtSigningKeys {
    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;
    private final String keyId;

    @Autowired
    public JwtSigningKeys(@Value("${application.security.jwt.private-key-path}") String privatePath,
                          @Value("${application.security.jwt.public-key-path}") String publicPath,
                          @Value("${application.security.jwt.key-id}") String keyId) throws Exception {
        this(new KeyPair(KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(readPem(publicPath, "PUBLIC KEY"))),
                KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(readPem(privatePath, "PRIVATE KEY")))), keyId);
    }

    public JwtSigningKeys(KeyPair pair, String keyId) throws GeneralSecurityException {
        if (!(pair.getPrivate() instanceof RSAPrivateKey signing) || !(pair.getPublic() instanceof RSAPublicKey verifying)
                || verifying.getModulus().bitLength() < 2048 || !signing.getModulus().equals(verifying.getModulus())
                || keyId == null || !keyId.matches("[A-Za-z0-9._-]{1,100}")) {
            throw new IllegalArgumentException("A matching RSA key pair (2048+ bits) and valid JWT key ID are required");
        }
        var signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(signing);
        signature.update("bookstore-key-check".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        byte[] proof = signature.sign();
        signature.initVerify(verifying);
        signature.update("bookstore-key-check".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        if (!signature.verify(proof)) throw new IllegalArgumentException("JWT key pair does not match");
        this.privateKey = signing;
        this.publicKey = verifying;
        this.keyId = keyId;
    }

    private static byte[] readPem(String path, String label) throws Exception {
        String pem = Files.readString(Path.of(path));
        return Base64.getDecoder().decode(pem.replace("-----BEGIN " + label + "-----", "")
                .replace("-----END " + label + "-----", "").replaceAll("\\s", ""));
    }

    public RSAPrivateKey privateKey() { return privateKey; }
    public RSAPublicKey publicKey() { return publicKey; }
    public String keyId() { return keyId; }

    public Map<String, Object> publicJwks() {
        return Map.of("keys", List.of(Map.of("kty", "RSA", "use", "sig", "alg", "RS256", "kid", keyId,
                "n", unsigned(publicKey.getModulus()), "e", unsigned(publicKey.getPublicExponent()))));
    }

    private static String unsigned(java.math.BigInteger value) {
        byte[] bytes = value.toByteArray();
        if (bytes[0] == 0) bytes = Arrays.copyOfRange(bytes, 1, bytes.length);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
