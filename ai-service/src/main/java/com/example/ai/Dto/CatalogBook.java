package com.example.ai.Dto;

import java.math.BigDecimal;
import java.util.List;

public record CatalogBook(Long id, String title, BigDecimal price, String description,
                          Reference category, Reference publisher, List<Reference> authors) {
    public record Reference(Long id, String name) {}
}
