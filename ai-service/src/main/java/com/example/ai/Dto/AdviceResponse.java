package com.example.ai.Dto;

import java.util.List;

public record AdviceResponse(String answer, List<CatalogBook> books, boolean degraded) {
}
