import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, X, ChevronDown } from 'lucide-react';
import {
  Button,
  BookCard,
  BookCardSkeleton,
  EmptyState,
  ErrorState,
  Pagination,
  SearchInput,
  Select,
  Card,
  Badge,
  Skeleton,
} from '../../components/ui';
import { bookApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

/**
 * BookListPage Component
 * Browse and filter books with search and pagination
 */
const BookListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Get params from URL
  const query = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') || '';
  const authorId = searchParams.get('author') || '';
  const publisherId = searchParams.get('publisher') || '';
  const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')) : '';
  const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')) : '';
  const sortBy = searchParams.get('sort') || 'newest';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')) : 1;
  const limit = 12;

  // State
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          limit,
          ...(query && { search: query }),
          ...(categoryId && { category_id: categoryId }),
          ...(authorId && { author_id: authorId }),
          ...(publisherId && { publisher_id: publisherId }),
          ...(minPrice && { min_price: minPrice }),
          ...(maxPrice && { max_price: maxPrice }),
          sort: sortBy,
        };

        const response = await bookApi.getBooks(params);
        setBooks(response?.data || []);
        setTotal(response?.total || 0);
        setError(null);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError(err.message || 'Failed to load books');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [query, categoryId, authorId, publisherId, minPrice, maxPrice, sortBy, page]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [catsRes, authRes, pubRes] = await Promise.all([
          bookApi.getCategories?.() || [],
          bookApi.getAuthors?.() || [],
          bookApi.getPublishers?.() || [],
        ]);
        setCategories(Array.isArray(catsRes) ? catsRes : []);
        setAuthors(Array.isArray(authRes) ? authRes : []);
        setPublishers(Array.isArray(pubRes) ? pubRes : []);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleClearFilters = () => {
    navigate('/books');
  };

  const handleSearch = (value) => {
    if (value?.trim()) {
      setSearchParams({ q: value.trim() });
    } else {
      searchParams.delete('q');
      setSearchParams(searchParams);
    }
  };

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = query || categoryId || authorId || publisherId || minPrice || maxPrice;

  const activeFilters = [
    query && { key: 'q', label: `Search: "${query}"` },
    categoryId && { key: 'category', label: `Category: ${categoryId}` },
    authorId && { key: 'author', label: `Author: ${authorId}` },
    publisherId && { key: 'publisher', label: `Publisher: ${publisherId}` },
    minPrice && { key: 'minPrice', label: `Min: ${minPrice}` },
    maxPrice && { key: 'maxPrice', label: `Max: ${maxPrice}` },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-paper dark:bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-md font-bold text-ink dark:text-ink mb-2">Browse Books</h1>
          <p className="text-body-md text-ink-muted dark:text-ink-muted">
            Found {total} book{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-heading-md text-ink dark:text-ink">Filters</h3>

              {/* Search */}
              <div>
                <label className="block text-body-sm font-medium text-ink dark:text-ink mb-2">
                  Search
                </label>
                <SearchInput
                  value={query}
                  onChange={handleSearch}
                  placeholder="Book name, author..."
                />
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-body-sm font-medium text-ink dark:text-ink mb-2">
                    Category
                  </label>
                  <Select
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    value={categoryId}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    placeholder="All categories"
                  />
                </div>
              )}

              {/* Author */}
              {authors.length > 0 && (
                <div>
                  <label className="block text-body-sm font-medium text-ink dark:text-ink mb-2">
                    Author
                  </label>
                  <Select
                    options={authors.map(a => ({ value: a.id, label: a.name }))}
                    value={authorId}
                    onChange={(e) => updateFilter('author', e.target.value)}
                    placeholder="All authors"
                  />
                </div>
              )}

              {/* Sort */}
              <div>
                <label className="block text-body-sm font-medium text-ink dark:text-ink mb-2">
                  Sort By
                </label>
                <Select
                  options={[
                    { value: 'newest', label: 'Newest' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'title', label: 'Title A-Z' },
                  ]}
                  value={sortBy}
                  onChange={(e) => updateFilter('sort', e.target.value)}
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                icon={mobileFilterOpen ? X : Filter}
              >
                {mobileFilterOpen ? 'Close Filters' : 'Filters'}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Mobile Filters */}
            {mobileFilterOpen && (
              <Card className="p-6 lg:hidden space-y-4 animate-slide-up">
                <SearchInput
                  value={query}
                  onChange={handleSearch}
                  placeholder="Search..."
                />
                {categories.length > 0 && (
                  <Select
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    value={categoryId}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    placeholder="All categories"
                  />
                )}
                <Select
                  options={[
                    { value: 'newest', label: 'Newest' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                  ]}
                  value={sortBy}
                  onChange={(e) => updateFilter('sort', e.target.value)}
                />
              </Card>
            )}

            {/* Active Filters Tags */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((f) => (
                  <Badge key={f.key} variant="primary" className="flex items-center gap-2">
                    {f.label}
                    <button
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.delete(f.key);
                        setSearchParams(params);
                      }}
                      className="ml-1 hover:opacity-70"
                    >
                      <X size={14} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Books Grid */}
            {error ? (
              <ErrorState
                title="Failed to load books"
                message={error}
                onRetry={() => window.location.reload()}
              />
            ) : loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <BookCardSkeleton key={i} />
                ))}
              </div>
            ) : books.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {books.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      href={`/books/${book.id}`}
                      onAddToCart={() => navigate(`/books/${book.id}`)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center pt-8">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onChange={(newPage) => {
                        setSearchParams({ ...Object.fromEntries(searchParams), page: String(newPage) });
                        window.scrollTo(0, 0);
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title={hasActiveFilters ? 'No books found' : 'No books available'}
                description={hasActiveFilters ? 'Try adjusting your filters' : 'Check back soon'}
                action={hasActiveFilters ? handleClearFilters : undefined}
                actionLabel="Clear Filters"
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default BookListPage;
