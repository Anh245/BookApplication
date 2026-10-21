package com.bookstore.order.client;

import com.bookstore.order.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.TreeMap;

@Slf4j
@Component
@ConditionalOnProperty(name = "inventory.mock", havingValue = "true")
public class MockInventoryClient implements InventoryClient {

    // tồn kho giả: sách 1 có 20 cuốn, sách 2 có 15 cuốn (mất khi tắt app)
    private final Map<Long, Integer> stock = new HashMap<>(Map.of(1L, 20, 2L, 15));
    private final Map<Long, List<StockItem>> deductions = new HashMap<>();
    private final Set<Long> restorations = new HashSet<>();

    @Override
    public synchronized void checkStock(Long bookId, int quantity) {
        int available = stock.getOrDefault(bookId, 0);
        if (quantity > available) {
            throw new BadRequestException("Sách " + bookId + " chỉ còn " + available + " cuốn trong kho");
        }
    }

    @Override
    public synchronized void deduct(Long orderId, List<StockItem> items) {
        if (deductions.containsKey(orderId)) return;
        Map<Long, Integer> quantities = new TreeMap<>();
        for (StockItem item : items) quantities.merge(item.bookId(), item.quantity(), Math::addExact);
        quantities.forEach(this::checkStock);
        quantities.forEach((bookId, quantity) -> stock.merge(bookId, -quantity, Integer::sum));
        deductions.put(orderId, quantities.entrySet().stream()
                .map(entry -> new StockItem(entry.getKey(), entry.getValue())).toList());
        log.info("[MOCK] Đơn {} trừ kho -> tồn hiện tại: {}", orderId, stock);
    }

    @Override
    public synchronized void restore(Long orderId, List<StockItem> items) {
        List<StockItem> deducted = deductions.get(orderId);
        if (deducted == null || !restorations.add(orderId)) return;
        for (StockItem i : deducted) stock.merge(i.bookId(), i.quantity(), Integer::sum);
        log.info("[MOCK] Đơn {} hoàn kho -> tồn hiện tại: {}", orderId, stock);
    }
}
