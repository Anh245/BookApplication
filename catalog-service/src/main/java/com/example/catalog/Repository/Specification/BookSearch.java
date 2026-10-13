package com.example.catalog.Repository.Specification;

import com.example.catalog.Model.Book;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class BookSearch {
    private BookSearch() {}

    public static Specification<Book> matching(String query, Long categoryId, Long authorId, Long publisherId,
                                        BigDecimal minPrice, BigDecimal maxPrice) {
        return (root, criteria, cb) -> {
            criteria.distinct(true);
            var predicates = new ArrayList<Predicate>();
            predicates.add(cb.isTrue(root.get("active")));
            if (categoryId != null) predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            if (publisherId != null) predicates.add(cb.equal(root.get("publisher").get("id"), publisherId));
            if (authorId != null) predicates.add(cb.equal(root.join("authors").get("id"), authorId));
            if (minPrice != null) predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            if (maxPrice != null) predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            if (query != null && !query.isBlank()) {
                String pattern = "%" + escape(query.trim().toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern, '\\'),
                        cb.like(cb.lower(root.get("description")), pattern, '\\'),
                        cb.like(cb.lower(root.get("category").get("name")), pattern, '\\'),
                        cb.like(cb.lower(root.get("publisher").get("name")), pattern, '\\'),
                        cb.like(cb.lower(root.join("authors", JoinType.LEFT).get("name")), pattern, '\\')));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
