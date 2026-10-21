package com.bookstore.order.security;

import com.bookstore.order.entity.*;
import com.bookstore.order.enums.*;
import com.bookstore.order.repository.*;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"payments.vnpay.enabled=true", "payments.vnpay.tmn-code=TESTCODE",
        "payments.vnpay.hash-secret=only-a-test-vnpay-secret"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VnpayIpnIntegrationTests extends JwtTestProperties {
    @Autowired MockMvc mvc;
    @Autowired OrderRepository orders;
    @Autowired PaymentRepository payments;
    Payment payment;

    @BeforeEach
    void setUp() {
        Order order = new Order();
        order.setUserId(7L);
        order.setShippingAddress("Test");
        order.setTotalAmount(new BigDecimal("1000.50"));
        order.setPaymentMethod(PaymentMethod.VNPAY);
        order.setPaymentStatus(PaymentStatus.PENDING);
        orders.saveAndFlush(order);
        payment = new Payment();
        payment.setOrder(order);
        payment.setMethod(PaymentMethod.VNPAY);
        payment.setAmount(order.getTotalAmount());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setTransactionRef("TXN-" + UUID.randomUUID());
        payments.saveAndFlush(payment);
    }

    @AfterEach
    void cleanUp() {
        payments.deleteAll();
        orders.deleteAll();
    }

    @Test
    void validIpnUpdatesOnceAndRepeatedIpnReturnsAlreadyConfirmed() throws Exception {
        var request = signed(Map.of());
        ipn(request).andExpect(status().isOk()).andExpect(jsonPath("$.RspCode").value("00"));
        var first = payments.findById(payment.getId()).orElseThrow();
        assertThat(first.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(first.getVnpayTransactionNo()).isEqualTo("123456789");
        ipn(request).andExpect(jsonPath("$.RspCode").value("02"));
        assertThat(payments.findById(payment.getId()).orElseThrow().getPaidAt()).isEqualTo(first.getPaidAt());
        assertThat(orders.findById(payment.getOrder().getId()).orElseThrow().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    void tamperingWithSignedAmountIsRejectedBeforeUpdatingData() throws Exception {
        var request = signed(Map.of());
        request.set("vnp_Amount", "1");
        ipn(request).andExpect(jsonPath("$.RspCode").value("97"));
        assertPending();
    }

    @Test
    void validSignatureDoesNotPermitWrongMerchantAmountOrUnknownPayment() throws Exception {
        ipn(signed(Map.of("vnp_TmnCode", "ATTACKER"))).andExpect(jsonPath("$.RspCode").value("97"));
        ipn(signed(Map.of("vnp_Amount", "100051"))).andExpect(jsonPath("$.RspCode").value("04"));
        ipn(signed(Map.of("vnp_TxnRef", "UNKNOWN"))).andExpect(jsonPath("$.RspCode").value("01"));
        assertPending();
    }

    @Test
    void rejectsUnsignedMalformedAndDuplicateParameters() throws Exception {
        ipn(new LinkedMultiValueMap<>()).andExpect(jsonPath("$.RspCode").value("97"));
        var duplicated = signed(Map.of());
        duplicated.add("vnp_Amount", "1");
        ipn(duplicated).andExpect(jsonPath("$.RspCode").value("97"));
        ipn(signed(Map.of("vnp_Amount", "1000.50"))).andExpect(jsonPath("$.RspCode").value("99"));
        ipn(signed(Map.of("vnp_CurrCode", "USD"))).andExpect(jsonPath("$.RspCode").value("99"));
        assertPending();
    }

    @Test
    void bothSuccessCodesAreRequiredAndFailedIpnCannotLaterBeReplayedAsSuccess() throws Exception {
        ipn(signed(Map.of("vnp_TransactionStatus", "02"))).andExpect(jsonPath("$.RspCode").value("00"));
        assertThat(payments.findById(payment.getId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.FAILED);
        ipn(signed(Map.of())).andExpect(jsonPath("$.RspCode").value("02"));
        assertThat(payments.findById(payment.getId()).orElseThrow().getPaidAt()).isNull();
    }

    @Test
    void pendingProviderStatusDoesNotFinalizePayment() throws Exception {
        ipn(signed(Map.of("vnp_TransactionStatus", "01"))).andExpect(jsonPath("$.RspCode").value("99"));
        assertPending();
    }

    @Test
    void cancelledOrderAndWrongPaymentMethodCannotBePaid() throws Exception {
        var order = orders.findById(payment.getOrder().getId()).orElseThrow();
        order.setOrderStatus(OrderStatus.CANCELLED);
        orders.saveAndFlush(order);
        ipn(signed(Map.of())).andExpect(jsonPath("$.RspCode").value("02"));
        assertPending();
        payment.setMethod(PaymentMethod.BANK_TRANSFER);
        payments.saveAndFlush(payment);
        ipn(signed(Map.of())).andExpect(jsonPath("$.RspCode").value("01"));
        assertPending();
    }

    @Test
    void aProviderTransactionNumberCannotPayASecondOrder() throws Exception {
        ipn(signed(Map.of())).andExpect(jsonPath("$.RspCode").value("00"));
        Order other = new Order();
        other.setUserId(7L);
        other.setShippingAddress("Other");
        other.setTotalAmount(new BigDecimal("1000.50"));
        orders.saveAndFlush(other);
        Payment second = new Payment();
        second.setOrder(other);
        second.setMethod(PaymentMethod.VNPAY);
        second.setAmount(other.getTotalAmount());
        second.setStatus(PaymentStatus.PENDING);
        second.setTransactionRef("TXN-other");
        payments.saveAndFlush(second);
        ipn(signed(Map.of("vnp_TxnRef", "TXN-other"))).andExpect(jsonPath("$.RspCode").value("02"));
        assertThat(payments.findById(second.getId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    @Test
    void concurrentDuplicateNotificationsOnlyUpdateOnce() throws Exception {
        var request = signed(Map.of());
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            Callable<String> task = () -> {
                start.await(5, TimeUnit.SECONDS);
                return ipn(request).andReturn().getResponse().getContentAsString();
            };
            var first = executor.submit(task);
            var second = executor.submit(task);
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                    .anyMatch(body -> body.contains("\"RspCode\":\"00\""))
                    .anyMatch(body -> body.contains("\"RspCode\":\"02\""));
            assertThat(payments.findById(payment.getId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PAID);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void oldAndMockCallbacksStayClosedWithoutDevelopmentProfile() throws Exception {
        for (String path : List.of("/api/payments/callback", "/api/payments/mock/callback")) {
            mvc.perform(post(path).header("Authorization", "Bearer " + TestTokens.user("ADMIN"))
                    .contentType("application/json").content("{\"transactionRef\":\"x\",\"success\":true}"))
                    .andExpect(status().isForbidden());
        }
        assertPending();
    }

    @Test
    void closingPaidVnpayOrderDoesNotPretendToRefund() throws Exception {
        ipn(signed(Map.of())).andExpect(jsonPath("$.RspCode").value("00"));
        mvc.perform(post("/api/orders/" + payment.getOrder().getId() + "/cancel")
                .header("Authorization", "Bearer " + TestTokens.user("CUSTOMER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.paymentStatus").value("PAID"));
        assertThat(payments.findById(payment.getId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PAID);
    }

    private void assertPending() {
        assertThat(payments.findById(payment.getId()).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PENDING);
    }

    private ResultActions ipn(MultiValueMap<String, String> parameters) throws Exception {
        return mvc.perform(get("/api/payments/vnpay/ipn").params(parameters));
    }

    private MultiValueMap<String, String> signed(Map<String, String> overrides) throws Exception {
        Map<String, String> fields = new TreeMap<>(Map.of(
                "vnp_TmnCode", "TESTCODE", "vnp_TxnRef", payment.getTransactionRef(),
                "vnp_Amount", "100050", "vnp_TransactionNo", "123456789",
                "vnp_ResponseCode", "00", "vnp_TransactionStatus", "00",
                "vnp_OrderInfo", "Thanh toan don hang: 123"));
        fields.putAll(overrides);
        StringJoiner data = new StringJoiner("&");
        fields.forEach((key, value) -> data.add(key + "=" + URLEncoder.encode(value, StandardCharsets.UTF_8)));
        var mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec("only-a-test-vnpay-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        var result = new LinkedMultiValueMap<String, String>();
        fields.forEach(result::set);
        result.set("vnp_SecureHash", HexFormat.of().formatHex(mac.doFinal(data.toString().getBytes(StandardCharsets.UTF_8))));
        return result;
    }
}

