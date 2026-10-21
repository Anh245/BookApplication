import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingCart, AlertCircle, BookOpen } from 'lucide-react';
import { Card, Button, Skeleton, ErrorState, PageHeader, ChartCard, DataTable, StatusBadge } from '../../components/ui';
import { statsApi, orderApi, bookApi } from '../../api/services';

/**
 * DashboardPage Component
 * Admin dashboard with key metrics, charts, and recent data
 */
const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockBooks, setLowStockBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [statsData, ordersData, inventoryData] = await Promise.all([
          statsApi.getDashboardStats?.() || {},
          orderApi.getOrders?.({ limit: 5, status: 'PENDING' }) || [],
          bookApi.getLowStockBooks?.({ limit: 5 }) || [],
        ]);

        setStats(statsData);
        setRecentOrders(Array.isArray(ordersData) ? ordersData : ordersData?.data || []);
        setLowStockBooks(Array.isArray(inventoryData) ? inventoryData : inventoryData?.data || []);
        setErrors({});
      } catch (err) {
        console.error('Dashboard error:', err);
        setErrors({ general: 'Failed to load dashboard' });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit', year: 'numeric' });

  // KPI Cards
  const kpis = [
    {
      title: 'Revenue (This Month)',
      value: formatPrice(stats?.monthly_revenue || 0),
      change: stats?.revenue_change || 0,
      icon: TrendingUp,
      color: 'primary',
    },
    {
      title: 'New Orders',
      value: stats?.new_orders_count || 0,
      change: stats?.orders_change || 0,
      icon: ShoppingCart,
      color: 'accent',
    },
    {
      title: 'Pending Orders',
      value: stats?.pending_orders_count || 0,
      change: 0,
      icon: AlertCircle,
      color: 'warning',
    },
    {
      title: 'Low Stock Items',
      value: stats?.low_stock_count || 0,
      change: 0,
      icon: BookOpen,
      color: 'danger',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to Phương Anh Admin Portal"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} type="rect" height="150px" />
          ))
        ) : (
          kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <Card key={i} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-body-sm text-ink-muted dark:text-ink-muted">
                    {kpi.title}
                  </h3>
                  <div className={`p-2 rounded-button bg-${kpi.color}-light dark:bg-${kpi.color}-light/20`}>
                    <Icon className={`w-5 h-5 text-${kpi.color} dark:text-${kpi.color}-light`} />
                  </div>
                </div>

                <div>
                  <p className={`text-display-sm font-bold text-${kpi.color} dark:text-${kpi.color}-light`}>
                    {kpi.value}
                  </p>
                  {kpi.change !== 0 && (
                    <p className={`text-body-sm mt-2 ${kpi.change > 0 ? 'text-success' : 'text-danger'}`}>
                      {kpi.change > 0 ? '+' : ''}{kpi.change}% vs last month
                    </p>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Charts & Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Revenue (Last 30 Days)"
            loading={loading}
            error={errors.revenue}
            empty={!stats?.revenue_data}
          >
            {/* Placeholder for chart - would be replaced with Recharts */}
            <div className="h-64 bg-surface-muted dark:bg-surface rounded-card flex items-center justify-center text-ink-muted dark:text-ink-muted">
              Chart visualization (Recharts integration)
            </div>
          </ChartCard>
        </div>

        {/* Top Books */}
        <ChartCard
          title="Top 5 Books"
          loading={loading}
          error={errors.top_books}
          empty={!stats?.top_books}
        >
          <div className="space-y-3">
            {stats?.top_books?.slice(0, 5).map((book, i) => (
              <div key={book.id} className="flex items-center gap-3 p-2 hover:bg-surface-muted dark:hover:bg-surface rounded-button transition-colors">
                <span className="text-heading-sm font-bold text-primary dark:text-primary-light w-6 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-ink dark:text-ink truncate">
                    {book.title}
                  </p>
                  <p className="text-label text-ink-muted dark:text-ink-muted">
                    {book.sold_count} sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-heading-md text-ink dark:text-ink">Recent Orders</h3>
            <Link to="/admin/orders" className="text-primary hover:text-primary-dark dark:text-primary-light text-body-sm font-medium">
              View All →
            </Link>
          </div>

          {loading ? (
            <Skeleton count={5} height="50px" />
          ) : recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between p-3 hover:bg-surface-muted dark:hover:bg-surface rounded-button transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-body-sm text-ink dark:text-ink">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-label text-ink-muted dark:text-ink-muted">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-body-sm text-ink dark:text-ink">
                      {formatPrice(order.total_amount)}
                    </p>
                    <StatusBadge type="order" value={order.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-ink-muted dark:text-ink-muted">No pending orders</p>
          )}
        </Card>

        {/* Low Stock Items */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-heading-md text-ink dark:text-ink">Low Stock Items</h3>
            <Link to="/admin/inventory" className="text-primary hover:text-primary-dark dark:text-primary-light text-body-sm font-medium">
              View All →
            </Link>
          </div>

          {loading ? (
            <Skeleton count={5} height="50px" />
          ) : lowStockBooks.length > 0 ? (
            <div className="space-y-2">
              {lowStockBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between p-3 bg-danger-soft dark:bg-danger-soft/20 rounded-button"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-body-sm text-ink dark:text-ink line-clamp-1">
                      {book.title}
                    </p>
                    <p className="text-label text-danger dark:text-danger">
                      {book.stock_quantity} in stock
                    </p>
                  </div>
                  <Link
                    to={`/admin/inventory?search=${book.id}`}
                    className="text-primary hover:text-primary-dark dark:text-primary-light text-body-sm font-medium ml-4"
                  >
                    Import
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-ink-muted dark:text-ink-muted">All items well stocked</p>
          )}
        </Card>
      </div>

      {/* Refresh & Last Updated */}
      <div className="flex items-center justify-between p-4 bg-surface-muted dark:bg-surface rounded-card">
        <p className="text-body-sm text-ink-muted dark:text-ink-muted">
          Last updated: {new Date().toLocaleTimeString('vi-VN')}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default DashboardPage;
