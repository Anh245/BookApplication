package com.example.catalog.Integration;

import com.example.catalog.Controller.BookController;
import com.example.catalog.Dto.BookResponse;
import com.example.catalog.Dto.BookResponse.Reference;
import com.example.catalog.Service.BookService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Properties;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class OrderBookContractTests {
    @Test
    void catalogControllerPublishesTheContractConsumedByOrder() throws Exception {
        Properties contract = new Properties();
        try (var input = getClass().getResourceAsStream("/contracts/catalog/book-by-id.properties")) {
            contract.load(input);
        }
        String expected;
        try (var input = getClass().getResourceAsStream("/contracts/catalog/book-by-id.json")) {
            expected = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        BookService service = mock(BookService.class);
        when(service.get(42L)).thenReturn(new BookResponse(42L, "Effective Java", new BigDecimal("150000.50"),
                "Java programming practices", new Reference(1L, "Programming"),
                new Reference(2L, "Addison-Wesley"), List.of(new Reference(3L, "Joshua Bloch")), null, null));
        var mvc = MockMvcBuilders.standaloneSetup(new BookController(service)).build();
        mvc.perform(get(contract.getProperty("request.path")))
                .andExpect(status().is(Integer.parseInt(contract.getProperty("response.status"))))
                .andExpect(content().json(expected));
        verify(service).get(42L);
    }
}
