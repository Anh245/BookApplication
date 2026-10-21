import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  Button,
  BookCard,
  BookCardSkeleton,
  EmptyState,
  ErrorState,
  Card,
  Skeleton,
  Badge,
} from '../../components/ui';
import { bookApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

/**
 * HomePage Component
 * Hero banner, featured categories, new books, AI recommendations
 */
const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // State for different sections
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState(null);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setBooksLoading(true);
        const data = await bookApi.getBooks({ limit: 8, sort: 'newest' });
        setBooks(data?.data || []);
        setBooksError(null);
      } catch (err) {
        console.error('Error fetching books:', err);
        setBooksError('Failed to load books');
      } finally {
        setBooksLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await bookApi.getCategories?.();
        setCategories(Array.isArray(data) ? data.slice(0, 6) : []);
        setCategoriesError(null);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategoriesError(null); // Silent fail for categories
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSearch = (query) => {
    if (query?.trim()) {
      navigate(`/books?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleAddToCart = async (book) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/books/${book.id}`);
      return;
    }
    // Add to cart logic (will be in CartContext)
    navigate('/cart');
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-paper">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-primary via-primary-dark to-accent/20 dark:from-primary dark:via-primary-dark dark:to-accent/30 text-surface dark:text-surface py-12 md:py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-accent" />
                <span className="text-body-md font-semibold text-accent">Welcome to Phương Anh Bookstore</span>
              </div>

              <h1 className="text-display-md md:text-display-lg font-bold leading-tight">
                Discover Knowledge, Find Inspiration
              </h1>

              <p className="text-body-lg text-surface/90 dark:text-surface/90 leading-relaxed max-w-xl">
                Explore millions of curated books across all categories. Get personalized recommendations powered by AI and enjoy fast nationwide shipping.
              </p>

              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/books')}
                >
                  Explore Books
                  <ArrowRight className="w-5 h-5" />
                </Button>
                {isAuthenticated && (
                  <Button
                    variant="secondary"
                    size="lg"
                  >
                    Ask AI Assistant
                    <Sparkles className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Hero Image Placeholder */}
            <div className="hidden md:block">
              <div className="h-80 bg-surface/10 rounded-card flex items-center justify-center border-2 border-surface/20">
                <svg className="w-48 h-48 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.5 6.253 3 9.5 3 13.757c0 4.257 3.5 7.504 9 7.504s9-3.247 9-7.504c0-4.257-3.5-7.504-9-7.504z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-b border-border dark:border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-heading-lg md:text-display-sm font-bold text-ink dark:text-ink mb-8">
            Popular Categories
          </h2>

          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} type="rect" height="100px" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/books?category=${cat.id}`}
                  className="group"
                >
                  <Card className="p-4 h-full hover:shadow-lg transition-all cursor-pointer">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 mx-auto bg-primary-light dark:bg-primary-dark rounded-card flex items-center justify-center text-primary dark:text-primary-light font-bold text-lg group-hover:scale-110 transition-transform">
                        {cat.name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium text-body-sm text-ink dark:text-ink line-clamp-2">
                        {cat.name}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No categories available" />
          )}
        </div>
      </section>

      {/* New Books Section */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-heading-lg md:text-display-sm font-bold text-ink dark:text-ink">
              New Arrivals
            </h2>
            <Link
              to="/books?sort=newest"
              className="flex items-center gap-2 text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary font-semibold text-body-sm"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {booksError ? (
            <ErrorState
              title="Failed to load books"
              message={booksError}
              onRetry={() => window.location.reload()}
            />
          ) : booksLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <BookCardSkeleton key={i} />
              ))}
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  href={`/books/${book.id}`}
                  onAddToCart={() => handleAddToCart(book)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No books available"
              description="Check back soon for new releases"
            />
          )}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="bg-surface dark:bg-surface-muted py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-t border-border dark:border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: 'Fast Shipping',
                description: 'Free shipping on orders over 250k. Nationwide delivery in 2-5 days.',
                icon: '📦',
              },
              {
                title: '100% Authentic',
                description: 'All books are genuine and sourced directly from publishers.',
                icon: '✅',
              },
              {
                title: '7-Day Returns',
                description: 'Hassle-free returns if books have printing errors or damage.',
                icon: '🔄',
              },
            ].map((prop, i) => (
              <Card key={i} className="p-6 text-center space-y-3">
                <div className="text-4xl">{prop.icon}</div>
                <h3 className="font-semibold text-body-lg text-ink dark:text-ink">
                  {prop.title}
                </h3>
                <p className="text-body-sm text-ink-muted dark:text-ink-muted">
                  {prop.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-accent/10 to-primary/10 dark:from-accent/5 dark:to-primary/5 py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-heading-lg md:text-display-sm font-bold text-ink dark:text-ink mb-4">
            Join our community of readers
          </h2>
          <p className="text-body-md text-ink-muted dark:text-ink-muted mb-6 max-w-2xl mx-auto">
            Get exclusive book recommendations, early access to bestsellers, and special discounts.
          </p>
          {!isAuthenticated && (
            <Link to="/register">
              <Button variant="primary" size="lg">
                Sign Up Free
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
