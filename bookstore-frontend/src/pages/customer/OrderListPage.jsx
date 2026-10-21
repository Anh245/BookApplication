import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  Badge,
  StatusBadge,
  Button,
} from '../../components/ui';
import { orderApi } from '../../api/services';

/**
 * OrderListPage Component
 * View all customer orders
 */
const OrderListPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, delivered, cancelled

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params = filter !== 'all' ? { status: filter } : {};
        const data = await orderApi.getOrders(params);
        setOrders(Array.isArray(data) ? data : data?.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [filter]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const filterTabs = ['all', 'pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];

  if (loading) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} type="rect" height="180px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-display-md font-bold text-ink dark:text-ink mb-8">My Orders</h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-button font-medium text-body-sm whitespace-nowrap transition-smooth ${filter === tab
                  ? 'bg-primary text-surface dark:bg-primary-light dark:text-ink'
                  : 'bg-surface-muted text-ink-muted hover:bg-surface dark:bg-surface dark:text-ink-muted dark:hover:bg-surface-muted'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {error ? (
          <ErrorState
            title="Failed to load orders"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            description="You haven't placed any orders yet"
            action={() => window.location.href = '/books'}
            actionLabel="Start Shopping"
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-heading-md text-ink dark:text-ink">
                          Order #{order.id.toUpperCase().slice(0, 8)}
                        </h3>
                        <StatusBadge type="order" value={order.status} />
                      </div>
                      <p className="text-body-sm text-ink-muted dark:text-ink-muted">
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    {/* Order Summary */}
                    <div className="flex items-center gap-4 md:gap-8">
                      <div className="text-right">
                        <p className="text-caption text-ink-muted dark:text-ink-muted mb-1">Items</p>
                        <p className="font-bold text-body-md text-ink dark:text-ink">
                          {order.items?.length || 0} book{order.items?.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-caption text-ink-muted dark:text-ink-muted mb-1">Total</p>
                        <p className="font-bold text-heading-md text-primary dark:text-primary-light">
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>

                      {/* Payment Status */}
                      <div className="hidden sm:block">
                        <StatusBadge type="payment" value={order.payment_status} />
                      </div>

                      <ChevronRight className="w-5 h-5 text-ink-muted dark:text-ink-muted" />
                    </div>
                  </div>

                  {/* Book Thumbnails (first 3) */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 flex gap-2 pt-4 border-t border-border dark:border-border">
                      {order.items.slice(0, 3).map((item, i) => (
                        <img
                          key={i}
                          src={item.book?.image_url}
                          alt={item.book?.title}
                          className="w-12 h-16 rounded-cover object-cover bg-surface-muted dark:bg-surface"
                        />
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-12 h-16 rounded-cover bg-surface-muted dark:bg-surface flex items-center justify-center text-ink-muted dark:text-ink-muted text-label font-medium">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderListPage;
