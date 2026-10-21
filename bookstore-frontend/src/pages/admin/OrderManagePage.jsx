import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Button,
  Card,
  SearchInput,
  Select,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
  PageHeader,
  Badge,
} from '../../components/ui';
import { orderApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';

/**
 * OrderManagePage Component
 * Manage orders: view, update status, filter
 */
const OrderManagePage = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params = {
          ...(searchTerm && { search: searchTerm }),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          limit: 50,
        };
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

    const timer = setTimeout(fetchOrders, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await orderApi.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
      showToast('success', 'Order status updated');
    } catch (err) {
      showToast('error', err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const statuses = ['all', 'PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
  const nextStatuses = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['SHIPPING'],
    SHIPPING: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Orders"
        subtitle="Manage customer orders"
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchInput
          placeholder="Search by order ID or customer..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <Select
          options={statuses.map(s => ({
            value: s,
            label: s === 'all' ? 'All Statuses' : s.charAt(0) + s.slice(1).toLowerCase(),
          }))}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      {/* Orders List */}
      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} type="rect" height="120px" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1">
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="font-bold text-heading-md text-primary hover:text-primary-dark dark:text-primary-light mb-2"
                  >
                    Order #{order.id.slice(0, 8)}
                  </Link>
                  <div className="flex flex-wrap gap-4 text-body-sm text-ink-muted dark:text-ink-muted">
                    <span>
                      Customer: <span className="text-ink dark:text-ink font-medium">{order.customer_name}</span>
                    </span>
                    <span>
                      Date: <span className="text-ink dark:text-ink font-medium">{formatDate(order.created_at)}</span>
                    </span>
                    <span>
                      Items: <span className="text-ink dark:text-ink font-medium">{order.items?.length || 0}</span>
                    </span>
                  </div>
                </div>

                {/* Total & Status */}
                <div className="flex items-end justify-between md:flex-col md:items-end gap-4">
                  <div>
                    <p className="text-heading-lg font-bold text-primary dark:text-primary-light">
                      {formatPrice(order.total_amount)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <StatusBadge type="order" value={order.status} />
                      <StatusBadge type="payment" value={order.payment_status} />
                    </div>
                  </div>

                  {/* Status Change Dropdown */}
                  {nextStatuses[order.status]?.length > 0 && (
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={updatingId === order.id}
                      className="px-3 py-2 border border-border rounded-button bg-surface text-ink disabled:opacity-50 dark:bg-surface-muted dark:border-border dark:text-ink"
                    >
                      <option value={order.status}>{order.status}</option>
                      {nextStatuses[order.status].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderManagePage;
