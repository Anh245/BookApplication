import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import { getStats } from '../../api/services/statsApi';
import { formatVND } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ErrorState from '../../components/common/ErrorState';
import { Download } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const StatisticsPage = () => {
  const { data: stats, loading, error } = useFetch(
    async () => {
      const res = await getStats();
      return res.data || {};
    },
    []
  );

  const handleExport = async () => {
    try {
      const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent(
        'Thống kê doanh thu\n' +
        `Tổng doanh thu,${stats?.totalRevenue || 0}\n` +
        `Tổng đơn hàng,${stats?.totalOrders || 0}\n` +
        `Tổng sản phẩm,${stats?.totalProducts || 0}\n`
      );
      const link = document.createElement('a');
      link.setAttribute('href', csv);
      link.setAttribute('download', 'statistics.csv');
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  if (error) return <ErrorState message={error.message} />;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Thống kê</h1>
          <p className="text-gray-600 mt-1">Phân tích doanh thu và bán hàng</p>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={handleExport}
          icon={<Download size={18} />}
        >
          Xuất CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Tổng doanh thu</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatVND(stats?.totalRevenue || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Đơn hàng</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.totalOrders || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Sản phẩm bán</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.totalProductsSold || 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        {stats?.revenueData && stats.revenueData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Doanh thu theo ngày
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v) => formatVND(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  name="Doanh thu"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Orders Chart */}
        {stats?.ordersData && stats.ordersData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Đơn hàng theo trạng thái
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.ordersData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {stats.ordersData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category Performance */}
      {stats?.categoryData && stats.categoryData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Bán hàng theo danh mục
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Số lượng" />
              <Bar dataKey="revenue" fill="#10b981" name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Products */}
      {stats?.topProducts && stats.topProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Sản phẩm bán chạy
          </h2>
          <div className="space-y-2">
            {stats.topProducts.slice(0, 10).map((product, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    #{idx + 1} {product.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatVND(product.revenue)} / {product.soldCount} bản
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsPage;
