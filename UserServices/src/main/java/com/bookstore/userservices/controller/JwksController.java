package com.bookstore.userservices.controller;

import com.bookstore.userservices.security.JwtSigningKeys;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class JwksController {
    private final JwtSigningKeys keys;
    public JwksController(JwtSigningKeys keys) { this.keys = keys; }

    @GetMapping("/.well-known/jwks.json")
    public ResponseEntity<Map<String, Object>> keys() {
        return ResponseEntity.ok().cacheControl(CacheControl.noCache()).body(keys.publicJwks());
    }
}
