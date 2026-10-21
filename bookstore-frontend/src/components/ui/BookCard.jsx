import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Button from './Button';
import Badge from './Badge';

/**
 * BookCard Component
 * Displays book information with add to cart functionality
 */
const BookCard = ({
  book,
  onAddToCart,
  loading = false,
  href,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const stockStatus = book?.stockQuantity == null
    ? { label: 'Xem chi tiết tồn kho', variant: 'info' }
    : book?.stockQuantity > 5
    ? { label: 'Còn hàng', variant: 'success' }
    : book?.stockQuantity > 0
      ? { label: 'Sắp hết', variant: 'warning' }
      : { label: 'Hết hàng', variant: 'danger' };

  const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22280%22 viewBox=%220 0 200 280%22%3E%3Crect fill=%22%23E8E3DB%22 width=%22200%22 height=%22280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22serif%22 font-size=%2216%22 fill=%22%236B6660%22%3ENo Image%3C/text%3E%3C/svg%3E';

  return (
    <div className={`group ${className}`.trim()}>
      {/* Image Container */}
      <div className="relative mb-3 overflow-hidden rounded-cover bg-surface-muted dark:bg-surface aspect-[3/4]">
        <a href={href} className="block h-full w-full">
          <img
            src={imageError ? fallbackImage : (book?.imageUrl || fallbackImage)}
            alt={book?.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </a>
        
        {/* Stock Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={stockStatus.variant} size="sm">
            {stockStatus.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <a href={href} className="block mb-2">
        <h3 className="text-body-sm font-semibold text-ink dark:text-ink line-clamp-2 hover:text-primary transition-colors dark:hover:text-primary-light">
          {book?.title}
        </h3>
      </a>

      {/* Authors */}
      {book?.authors && book.authors.length > 0 && (
        <p className="text-caption text-ink-muted dark:text-ink-muted mb-1 line-clamp-1">
          {book.authors.map(a => a.authorName).join(', ')}
        </p>
      )}

      {/* Price */}
      <p className="text-heading-sm font-semibold text-primary dark:text-primary-light mb-3">
        {new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
          minimumFractionDigits: 0,
        }).format(book?.price || 0)}
      </p>

      {/* Add to Cart Button */}
      <Button
        onClick={() => onAddToCart?.(book)}
        variant="accent"
        size="sm"
        disabled={book?.stockQuantity === 0}
        loading={loading}
        icon={ShoppingCart}
        className="w-full"
      >
        Thêm giỏ
      </Button>
    </div>
  );
};

export default BookCard;
