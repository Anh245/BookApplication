import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, BookOpen } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { getStockStatus } from '../../utils/helpers';
import { STOCK_STATUS_LABELS, STOCK_STATUS_COLORS } from '../../utils/constants';

/**
 * BookCard: Thẻ sản phẩm sách tối ưu đa màn hình (Mobile & Desktop)
 * Hiển thị chuẩn 2 cột trên mobile và 3-5 cột trên desktop
 */
const BookCard = ({
  book,
  onAddToCart,
  onAddToWishlist,
  loading = false,
  className = '',
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imgError, setImgError] = useState(false);

  const stockStatus = getStockStatus(book.stock);
  const isOutOfStock = stockStatus === 'out_of_stock';

  // Tính phần trăm giảm giá nếu có
  const discountPercent =
    book.originalPrice && book.originalPrice > book.price
      ? Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)
      : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(book);
    }
  };

  const handleAddToWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    if (onAddToWishlist) {
      onAddToWishlist(book);
    }
  };

  return (
    <div
      className={`group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200/80 dark:border-gray-700/80 overflow-hidden flex flex-col h-full hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 ${className}`}
    >
      {/* Book Cover Image Area */}
      <Link
        to={`/books/${book.id}`}
        className="relative block w-full pt-[130%] bg-slate-100 dark:bg-gray-700/50 overflow-hidden"
      >
        {book.image && !imgError ? (
          <img
            src={book.image}
            alt={book.title}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            <BookOpen size={36} className="text-indigo-400 mb-2 opacity-60" />
            <p className="text-[11px] font-medium text-gray-500 line-clamp-2 px-2">
              {book.title}
            </p>
          </div>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-rose-600 text-white font-extrabold text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm">
            -{discountPercent}%
          </div>
        )}

        {/* Stock Status Badge */}
        <div
          className={`absolute top-2 right-2 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold backdrop-blur-md shadow-sm ${STOCK_STATUS_COLORS[stockStatus]}`}
        >
          {STOCK_STATUS_LABELS[stockStatus]}
        </div>

        {/* Quick Wishlist Icon (Floating on desktop hover, visible on mobile) */}
        <button
          onClick={handleAddToWishlist}
          disabled={loading}
          className={`absolute bottom-2 right-2 p-1.5 sm:p-2 rounded-full backdrop-blur-md shadow-md transition-all ${
            isWishlisted
              ? 'bg-rose-500 text-white'
              : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:text-rose-500'
          }`}
          aria-label="Thêm vào yêu thích"
        >
          <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </Link>

      {/* Book Info Body */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category */}
          {book.category && (
            <Link
              to={`/books?category=${book.category.id}`}
              className="inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mb-1 truncate max-w-full"
            >
              {book.category.name}
            </Link>
          )}

          {/* Book Title */}
          <Link
            to={`/books/${book.id}`}
            className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 leading-snug mb-1 transition-colors"
            title={book.title}
          >
            {book.title}
          </Link>

          {/* Authors */}
          {book.authors && book.authors.length > 0 && (
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
              {book.authors.map((a) => a.name).join(', ')}
            </p>
          )}

          {/* Rating Display */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex text-amber-400">
              <Star size={12} fill="currentColor" />
            </div>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
              {book.rating ? Number(book.rating).toFixed(1) : '4.9'}
            </span>
            <span className="text-[10px] text-gray-400">
              ({book.reviewsCount || 48})
            </span>
          </div>
        </div>

        {/* Pricing and Action */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 mt-auto">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatVND(book.price)}
            </span>
            {book.originalPrice && book.originalPrice > book.price && (
              <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                {formatVND(book.originalPrice)}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || loading}
            className="w-full py-1.5 sm:py-2 px-2.5 rounded-lg sm:rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <ShoppingCart size={14} />
            <span>{isOutOfStock ? 'Hết hàng' : 'Thêm giỏ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
