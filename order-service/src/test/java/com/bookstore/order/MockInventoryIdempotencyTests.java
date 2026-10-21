package com.bookstore.order;

import com.bookstore.order.client.MockInventoryClient;
import com.bookstore.order.client.StockItem;
import com.bookstore.order.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class MockInventoryIdempotencyTests {
    @Test
    void replayedDeductAndRestoreDoNotChangeStockTwice() {
        var inventory = new MockInventoryClient();
        var items = List.of(new StockItem(1L, 2));
        inventory.deduct(1L, items);
        inventory.deduct(1L, items);
        inventory.checkStock(1L, 18);
        assertThatThrownBy(() -> inventory.checkStock(1L, 19)).isInstanceOf(BadRequestException.class);
        inventory.restore(1L, List.of(new StockItem(1L, 100)));
        inventory.restore(1L, items);
        inventory.deduct(1L, items);
        inventory.checkStock(1L, 20);
        assertThatThrownBy(() -> inventory.checkStock(1L, 21)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void earlyRestoreDoesNotConsumeLaterRestore() {
        var inventory = new MockInventoryClient();
        var items = List.of(new StockItem(1L, 2));
        inventory.restore(2L, items);
        inventory.deduct(2L, items);
        inventory.restore(2L, items);
        inventory.checkStock(1L, 20);
    }

    @Test
    void insufficientAggregatedStockRejectsWholeDeduction() {
        var inventory = new MockInventoryClient();
        assertThatThrownBy(() -> inventory.deduct(3L,
                List.of(new StockItem(1L, 11), new StockItem(1L, 11))))
                .isInstanceOf(BadRequestException.class);
        inventory.checkStock(1L, 20);
    }
}
