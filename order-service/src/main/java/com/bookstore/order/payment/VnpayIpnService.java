package com.bookstore.order.payment;

import java.math.BigInteger;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@ConditionalOnProperty(name = "payments.vnpay.enabled", havingValue = "true")
public class VnpayIpnService {
    private static final Logger log = LoggerFactory.getLogger(VnpayIpnService.class);
    private final VnpaySignatureVerifier verifier;
    private final VnpayPaymentProcessor processor;

    public VnpayIpnService(VnpaySignatureVerifier verifier, VnpayPaymentProcessor processor) {
        this.verifier = verifier;
        this.processor = processor;
    }

    public VnpayIpnResponse handle(MultiValueMap<String, String> parameters) {
        if (!verifier.verify(parameters)) return VnpayIpnResponse.of("97");
        if (!verifier.matchesMerchant(parameters.getFirst("vnp_TmnCode"))) return VnpayIpnResponse.of("97");
        String ref = parameters.getFirst("vnp_TxnRef");
        String amount = parameters.getFirst("vnp_Amount");
        String transaction = parameters.getFirst("vnp_TransactionNo");
        String response = parameters.getFirst("vnp_ResponseCode");
        String status = parameters.getFirst("vnp_TransactionStatus");
        String currency = parameters.getFirst("vnp_CurrCode");
        if (!matches(ref, "[A-Za-z0-9_-]{1,100}") || !matches(amount, "[0-9]{1,12}")
                || !matches(transaction, "[0-9]{1,15}") || !matches(response, "[0-9]{2}")
                || !matches(status, "[0-9]{2}") || (currency != null && !currency.equals("VND"))) {
            return VnpayIpnResponse.of("99");
        }
        BigInteger paidAmount = new BigInteger(amount);
        if (paidAmount.signum() <= 0 || ("00".equals(response) && "00".equals(status)
                && new BigInteger(transaction).signum() <= 0)) return VnpayIpnResponse.of("99");
        if (status.equals("01") || status.equals("05") || status.equals("06")) return VnpayIpnResponse.of("99");
        try {
            // The separate transactional bean commits before returning the IPN acknowledgement.
            return processor.process(new VnpayNotification(ref, paidAmount, new BigInteger(transaction).toString(), response, status));
        } catch (RuntimeException error) {
            log.warn("VNPAY IPN update rolled back: {}", error.getClass().getSimpleName());
            // Includes rollback/unique conflicts: VNPAY must retry instead of receiving a false success.
            return VnpayIpnResponse.of("99");
        }
    }

    private static boolean matches(String value, String pattern) { return value != null && value.matches(pattern); }
}

