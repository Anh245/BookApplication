package com.bookstore.order.payment;

import java.math.BigInteger;

public record VnpayNotification(String transactionRef, BigInteger amount, String transactionNo,
                                String responseCode, String transactionStatus) {
    public boolean successful() {
        return "00".equals(responseCode) && "00".equals(transactionStatus);
    }
}

