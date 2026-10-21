package com.bookstore.order.controller;

import com.bookstore.order.payment.VnpayIpnResponse;
import com.bookstore.order.payment.VnpayIpnService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

@RestController
@ConditionalOnProperty(name = "payments.vnpay.enabled", havingValue = "true")
public class VnpayIpnController {
    private final VnpayIpnService ipn;

    public VnpayIpnController(VnpayIpnService ipn) { this.ipn = ipn; }

    @GetMapping("/api/payments/vnpay/ipn")
    public ResponseEntity<VnpayIpnResponse> notify(@RequestParam MultiValueMap<String, String> parameters) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ipn.handle(parameters));
    }
}

