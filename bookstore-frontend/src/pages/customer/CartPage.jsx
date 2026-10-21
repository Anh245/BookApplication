import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  QuantityInput,
  ConfirmModal,
  Badge,
  Skeleton,
} from '../../components/ui';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

/**
 * CartPage Component
 * Shopping cart with product list and checkout
 */
const CartPage = () => {
  const navigate = useNavigate();
  const { items, loading, updateQuantity, removeItem, getTotal } = useCart();
  const { showToast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const total = getTotal?.() || 0;

  const handleQuantityChange = async (bookId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      setUpdatingId(bookId);
      await updateQuantity(bookId, newQuantity);
    } catch (err) {
      showToast('error', err.message || 'Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (bookId) => {
    try {
      await removeItem(bookId);
      showToast('success', 'Item removed from cart');
      setDeleteConfirm(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to remove item');
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} type="rect" height="120px" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Add some books to get started"
            action={() => navigate('/books')}
            actionLabel="Continue Shopping"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-md font-bold text-ink dark:text-ink mb-2">Shopping Cart</h1>
          <p className="text-body-md text-ink-muted dark:text-ink-muted">
            {items.length} item{items.length !== 1 ? 's' : ''} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card className="divide-y divide-border dark:divide-border">
              {items.map((item) => (
                <div key={item.book_id} className="p-4 sm:p-6 flex gap-4 hover:bg-surface-muted dark:hover:bg-surface-muted transition-colors">
                  {/* Product Image */}
                  <Link
                    to={`/books/${item.book_id}`}
                    className="flex-shrink-0 w-20 h-28 md:w-24 md:h-36 rounded-cover overflow-hidden bg-surface-muted dark:bg-surface"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-muted dark:text-ink-muted">
                        No Image
                      </div>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Title */}
                    <Link
                      to={`/books/${item.book_id}`}
                      className="text-body-md font-semibold text-ink dark:text-ink hover:text-primary dark:hover:text-primary-light line-clamp-2 mb-1"
                    >
                      {item.title}
                    </Link>

                    {/* Author */}
                    {item.author && (
                      <p className="text-body-sm text-ink-muted dark:text-ink-muted mb-2">
                        by {item.author}
                      </p>
                    )}

                    {/* Price & Quantity Row */}
                    <div className="flex items-end justify-between gap-2 mt-auto">
                      <div className="space-y-2">
                        {/* Price per unit */}
                        <p className="text-body-sm text-ink-muted dark:text-ink-muted">
                          {formatPrice(item.price)}
                        </p>

                        {/* Quantity Control */}
                        <QuantityInput
                          value={item.quantity}
                          onChange={(q) => handleQuantityChange(item.book_id, q)}
                          max={item.stock_quantity || 999}
                          disabled={updatingId === item.book_id}
                        />
                      </div>

                      {/* Total & Delete */}
                      <div className="space-y-3 text-right">
                        <div>
                          <p className="text-heading-sm font-bold text-ink dark:text-ink">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          <p className="text-caption text-ink-muted dark:text-ink-muted">
                            x{item.quantity}
                          </p>
                        </div>

                        <button
                          onClick={() => setDeleteConfirm(item.book_id)}
                          className="text-danger hover:text-danger-dark dark:text-danger dark:hover:text-danger-dark font-medium text-body-sm transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            {/* Continue Shopping */}
            <div className="mt-6">
              <Link to="/books" className="inline-flex items-center gap-2 text-primary dark:text-primary-light hover:text-primary-dark font-semibold">
                <ArrowLeft size={16} />
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24 space-y-4">
              <h2 className="font-bold text-heading-md text-ink dark:text-ink">Order Summary</h2>

              {/* Breakdown */}
              <div className="space-y-2 border-b border-border dark:border-border pb-4">
                <div className="flex justify-between text-body-sm">
                  <span className="text-ink-muted dark:text-ink-muted">Subtotal:</span>
                  <span className="text-ink dark:text-ink font-medium">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-ink-muted dark:text-ink-muted">Shipping:</span>
                  <span className="text-ink dark:text-ink font-medium">
                    {total >= 250000 ? (
                      <Badge variant="success" size="sm">Free</Badge>
                    ) : (
                      formatPrice(30000)
                    )}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between pt-4">
                <span className="font-bold text-heading-md text-ink dark:text-ink">Total:</span>
                <span className="font-bold text-heading-lg text-primary dark:text-primary-light">
                  {formatPrice(total >= 250000 ? total : total + 30000)}
                </span>
              </div>

              {/* Promo Info */}
              {total < 250000 && (
                <div className="bg-info-soft dark:bg-info-soft/20 p-3 rounded-button text-body-sm text-info dark:text-info">
                  Free shipping on orders over 250k
                </div>
              )}

              {/* Checkout Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/checkout')}
                className="w-full mt-6"
              >
                Proceed to Checkout
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Remove from Cart?"
        message="Are you sure you want to remove this item from your cart?"
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

export default CartPage;
