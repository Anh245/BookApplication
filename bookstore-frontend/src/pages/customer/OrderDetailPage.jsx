import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import {
  Card,
  ErrorState,
  DetailSkeleton,
  Badge,
  StatusBadge,
  Button,
} from '../../components/ui';
import { orderApi } from '../../api/services';

/**
 * OrderDetailPage Component
 * View order details and tracking
 */
const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await orderApi.getOrderDetail(id);
        setOrder(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err.response?.status === 404 ? 'Order not found' : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const statusTimeline = [
    { status: 'PENDING', label: 'Order Placed' },
    { status: 'CONFIRMED', label: 'Confirmed' },
    { status: 'PREPARING', label: 'Preparing' },
    { status: 'SHIPPING', label: 'Shipping' },
    { status: 'DELIVERED', label: 'Delivered' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <ErrorState
          title={error === 'Order not found' ? 'Order not found' : 'Failed to load order'}
          message={error}
          onRetry={() => navigate('/orders')}
          retryLabel="Back to Orders"
        />
      </div>
    );
  }

  const currentStatusIndex = statusTimeline.findIndex(s => s.status === order.status);

  return (
    <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark dark:text-primary-light mb-8 font-semibold"
        >
          <ChevronLeft size={16} />
          Back to Orders
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-display-md font-bold text-ink dark:text-ink">
              Order #{order.id.toUpperCase().slice(0, 8)}
            </h1>
            <p className="text-body-md text-ink-muted dark:text-ink-muted mt-2">
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge type="order" value={order.status} />
            <StatusBadge type="payment" value={order.payment_status} />
          </div>
        </div>

        {/* Status Timeline */}
        {!order.cancelled && (
          <Card className="p-6 mb-8">
            <h2 className="font-bold text-heading-md text-ink dark:text-ink mb-6">Delivery Status</h2>
            <div className="flex justify-between gap-2">
              {statusTimeline.map((step, index) => (
                <div key={step.status} className="flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-body-sm mb-2 transition-colors ${index <= currentStatusIndex
                        ? 'bg-primary text-surface dark:bg-primary-light dark:text-ink'
                        : 'bg-surface-muted text-ink-muted dark:bg-surface dark:text-ink-muted'
                      }`}>
                      {index + 1}
                    </div>
                    <p className="text-caption font-medium text-center text-ink dark:text-ink">
                      {step.label}
                    </p>
                  </div>
                  {index < statusTimeline.length - 1 && (
                    <div className={`h-1 mx-1 my-3 transition-colors ${index < currentStatusIndex
                        ? 'bg-primary dark:bg-primary-light'
                        : 'bg-border dark:bg-border'
                      }`} />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Cancelled Notice */}
        {order.cancelled && (
          <div className="mb-8 p-4 bg-danger-soft dark:bg-danger-soft/20 rounded-card flex gap-3">
            <AlertCircle className="w-5 h-5 text-danger dark:text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-body-md text-danger dark:text-danger">Order Cancelled</p>
              {order.cancellation_reason && (
                <p className="text-body-sm text-danger dark:text-danger mt-1">{order.cancellation_reason}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Order Items */}
            <Card className="divide-y divide-border dark:divide-border">
              <div className="p-6">
                <h2 className="font-bold text-heading-md text-ink dark:text-ink mb-4">Order Items</h2>
              </div>

              {order.items?.map((item) => (
                <div key={item.id} className="p-6 flex gap-4">
                  {item.book?.image_url && (
                    <img
                      src={item.book.image_url}
                      alt={item.book?.title}
                      className="w-20 h-28 rounded-cover object-cover bg-surface-muted dark:bg-surface"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-body-md text-ink dark:text-ink">
                      {item.book?.title}
                    </h3>
                    {item.book?.authors && (
                      <p className="text-body-sm text-ink-muted dark:text-ink-muted mt-1">
                        by {item.book.authors.map(a => a.name).join(', ')}
                      </p>
                    )}
                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <p className="text-body-sm text-ink-muted dark:text-ink-muted">
                          {formatPrice(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-heading-sm text-ink dark:text-ink">
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            {/* Order History */}
            {order.status_history && order.status_history.length > 0 && (
              <Card className="p-6">
                <h2 className="font-bold text-heading-md text-ink dark:text-ink mb-4">Order History</h2>
                <div className="space-y-3">
                  {order.status_history.map((event, i) => (
                    <div key={i} className="flex gap-4 pb-3 border-b border-border dark:border-border last:border-0">
                      <div className="text-body-sm text-ink-muted dark:text-ink-muted min-w-fit">
                        {formatDate(event.changed_at)}
                      </div>
                      <div>
                        <p className="font-medium text-body-sm text-ink dark:text-ink">
                          {event.old_status} → {event.new_status}
                        </p>
                        {event.note && (
                          <p className="text-body-sm text-ink-muted dark:text-ink-muted mt-1">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Shipping Info */}
            <Card className="p-6 space-y-3">
              <h3 className="font-bold text-heading-md text-ink dark:text-ink">Shipping Address</h3>
              <div className="text-body-sm text-ink dark:text-ink space-y-1">
                <p className="font-medium">{order.customer_name}</p>
                <p>{order.customer_phone}</p>
                <p className="text-ink-muted dark:text-ink-muted whitespace-pre-wrap">
                  {order.shipping_address}
                </p>
              </div>
            </Card>

            {/* Payment Info */}
            <Card className="p-6 space-y-3">
              <h3 className="font-bold text-heading-md text-ink dark:text-ink">Payment Information</h3>
              <div className="space-y-2 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted dark:text-ink-muted">Method:</span>
                  <span className="text-ink dark:text-ink font-medium">
                    {order.payment_method === 'COD' ? 'Cash on Delivery' : order.payment_method === 'BANK_TRANSFER' ? 'Bank Transfer' : order.payment_method}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted dark:text-ink-muted">Status:</span>
                  <StatusBadge type="payment" value={order.payment_status} />
                </div>
              </div>
            </Card>

            {/* Order Summary */}
            <Card className="p-6 space-y-3">
              <h3 className="font-bold text-heading-md text-ink dark:text-ink">Order Summary</h3>
              <div className="space-y-2 text-body-sm border-b border-border dark:border-border pb-3">
                <div className="flex justify-between">
                  <span className="text-ink-muted dark:text-ink-muted">Subtotal:</span>
                  <span className="text-ink dark:text-ink">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted dark:text-ink-muted">Shipping:</span>
                  <span className="text-ink dark:text-ink">{formatPrice(order.shipping_cost || 0)}</span>
                </div>
              </div>
              <div className="flex justify-between font-bold pt-3">
                <span className="text-ink dark:text-ink">Total:</span>
                <span className="text-heading-lg text-primary dark:text-primary-light">
                  {formatPrice(order.total_amount)}
                </span>
              </div>
            </Card>

            {/* Action Buttons */}
            {!order.cancelled && currentStatusIndex < statusTimeline.length - 1 && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Status
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
