package com.example.ai.Service;

import com.example.ai.Client.CatalogClient;
import com.example.ai.Dto.AdviceMode;
import com.example.ai.Dto.AdviceRequest;
import com.example.ai.Dto.AdviceResponse;
import com.example.ai.Dto.CatalogBook;
import com.example.ai.Provider.AiProvider;

import java.util.*;
import java.util.concurrent.*;
import org.springframework.stereotype.Service;

@Service
public class AdviceService {
    private final CatalogClient catalog;
    private final AiProvider provider;
    private final HistoryService history;

    public AdviceService(CatalogClient catalog, AiProvider provider, HistoryService history) {
        this.catalog = catalog; this.provider = provider; this.history = history;
    }

    public CompletionStage<AdviceResponse> advise(String subject, AdviceRequest request, AdviceMode mode) {
        List<Long> recentIds = history.recentBookIds(subject);
        List<CatalogBook> candidates = catalog.candidates(request.message(), recentIds);
        if (candidates.isEmpty()) {
            return CompletableFuture.completedFuture(new AdviceResponse("Hiện chưa có sách phù hợp trong danh mục.", List.of(), false));
        }
        return provider.advise(request, candidates, recentIds, mode)
                .handle((answer, failure) -> {
                    boolean degraded = failure != null || answer == null || answer.bookIds() == null
                            || answer.answer() == null || answer.answer().isBlank();
                    var allowed = candidates.stream().map(CatalogBook::id).collect(java.util.stream.Collectors.toSet());
                    List<Long> ids = degraded ? candidates.stream().map(CatalogBook::id).limit(request.limit()).toList()
                            : answer.bookIds().stream().filter(Objects::nonNull).filter(allowed::contains)
                                    .distinct().limit(request.limit()).toList();
                    // Reload after generation: books may have been edited or removed while the model was running.
                    List<CatalogBook> current = catalog.findBooks(ids);
                    var byId = new HashMap<Long, CatalogBook>();
                    current.forEach(book -> byId.put(book.id(), book));
                    List<CatalogBook> ordered = ids.stream().map(byId::get).filter(Objects::nonNull).toList();
                    String message = degraded
                            ? "AI tạm thời không khả dụng. Đây là kết quả tham khảo từ danh mục, chưa được AI xếp hạng."
                            : answer.answer();
                    return new AdviceResponse(message, ordered, degraded);
                });
    }
}
