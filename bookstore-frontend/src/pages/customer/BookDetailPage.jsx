import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingCart, Zap } from 'lucide-react';
import {
  Button,
  BookCardSkeleton,
  DetailSkeleton,
  ErrorState,
  Card,
  Badge,
  QuantityInput,
  Tabs,
  BookCard,
} from '../../components/ui';
import { bookApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

/**
 * BookDetailPage Component
 * Show detailed book information, add to cart, see related books
 */
const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [book, setBook] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);

  // Fetch book details
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        const data = await bookApi.getBookDetail(id);
        setBook(data);
        setError(null);

        // Fetch related books (same category)
        if (data?.category_id) {
          try {
            const related = await bookApi.getBooks({
              category_id: data.category_id,
              limit: 4,
              exclude_id: id,
            });
            setRelatedBooks(related?.data || []);
          } catch {
            setRelatedBooks([]);
          }
        }
      } catch (err) {
        console.error('Error fetching book:', err);
        if (err.response?.status === 404) {
          setError('Book not found');
        } else {
          setError('Failed to load book details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/books/${id}`);
      return;
    }

    if (!book || quantity < 1) return;

    try {
      setAddingToCart(true);
      await addItem(book.id, quantity);
      showToast('success', `Added ${quantity} book(s) to cart`);
      setQuantity(1);
    } catch (err) {
      showToast('error', err.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title={error === 'Book not found' ? 'Book not found' : 'Failed to load book'}
            message={error === 'Book not found' ? 'This book no longer exists' : error}
            onRetry={() => navigate('/books')}
            retryLabel="Back to Books"
          />
        </div>
      </div>
    );
  }

  const stockStatus =
    book.stock_quantity == null
      ? { label: 'Đăng nhập để kiểm tra tồn kho', variant: 'info' }
      : book.stock_quantity > 5
      ? { label: 'In Stock', variant: 'success' }
      : book.stock_quantity > 0
        ? { label: 'Limited Stock', variant: 'warning' }
        : { label: 'Out of Stock', variant: 'danger' };

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

  return (
    <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-body-sm text-ink-muted dark:text-ink-muted mb-8">
          <button onClick={() => navigate('/')} className="hover:text-primary">Home</button>
          <ChevronRight size={16} />
          <button onClick={() => navigate('/books')} className="hover:text-primary">Books</button>
          <ChevronRight size={16} />
          <span className="text-ink dark:text-ink font-medium truncate max-w-xs">{book.title}</span>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Book Image */}
          <div className="md:col-span-1">
            <Card className="sticky top-20 overflow-hidden">
              <div className="aspect-[3/4] bg-surface-muted dark:bg-surface rounded-card flex items-center justify-center">
                {book.image_url ? (
                  <img
                    src={book.image_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-ink-muted dark:text-ink-muted">
                    <p>No Image</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: Book Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Title & Meta */}
            <div className="space-y-3">
              <h1 className="text-display-md font-bold text-ink dark:text-ink">
                {book.title}
              </h1>

              {/* Authors */}
              {book.authors && book.authors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {book.authors.map((author, i) => (
                    <button
                      key={author.id}
                      onClick={() => navigate(`/books?author=${author.id}`)}
                      className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary font-medium"
                    >
                      {author.name}
                      {i < book.authors.length - 1 && ', '}
                    </button>
                  ))}
                </div>
              )}

              {/* Category & Publisher */}
              <div className="flex flex-wrap gap-4 text-body-sm text-ink-muted dark:text-ink-muted">
                {book.category && (
                  <div>
                    Category: <span className="text-primary dark:text-primary-light font-medium">{book.category.name}</span>
                  </div>
                )}
                {book.publisher && (
                  <div>
                    Publisher: <span className="text-primary dark:text-primary-light font-medium">{book.publisher.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price & Stock */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <p className="text-display-sm font-bold text-primary dark:text-primary-light">
                  {formatPrice(book.price)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={stockStatus.variant} size="sm">
                  {stockStatus.label}
                </Badge>
                {book.stock_quantity > 0 && (
                  <p className="text-body-sm text-ink-muted dark:text-ink-muted">
                    {book.stock_quantity} copies available
                  </p>
                )}
              </div>
            </div>

            {/* Quantity & Actions */}
            {book.stock_quantity !== 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-body-sm font-medium text-ink dark:text-ink mb-2">
                    Quantity
                  </label>
                  <QuantityInput
                    value={quantity}
                    onChange={setQuantity}
                    max={book.stock_quantity}
                    disabled={addingToCart}
                  />
                </div>

                <div className="flex gap-3 flex-col sm:flex-row">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleAddToCart}
                    loading={addingToCart}
                    icon={ShoppingCart}
                    disabled={addingToCart}
                    className="flex-1"
                  >
                    Add to Cart
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleBuyNow}
                    loading={addingToCart}
                    icon={Zap}
                    disabled={addingToCart}
                    className="flex-1"
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-danger-soft dark:bg-danger-soft rounded-card">
                <p className="text-danger font-medium">Out of Stock</p>
              </div>
            )}

            {/* Description */}
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-heading-md text-ink dark:text-ink">About This Book</h3>
              <p className="text-body-md text-ink-muted dark:text-ink-muted leading-relaxed whitespace-pre-wrap">
                {book.description || 'No description available'}
              </p>
            </Card>
          </div>
        </div>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <section className="mt-16 pt-16 border-t border-border dark:border-border">
            <h2 className="text-heading-lg font-bold text-ink dark:text-ink mb-6">
              Similar Books
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedBooks.map((relBook) => (
                <BookCard
                  key={relBook.id}
                  book={relBook}
                  href={`/books/${relBook.id}`}
                  onAddToCart={() => navigate(`/books/${relBook.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BookDetailPage;
