import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getUsers } from '../../api/services/userApi';
import { USER_STATUS_LABELS, USER_STATUS_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import DataTable from '../../components/common/DataTable';
import { ChevronRight } from 'lucide-react';

const CustomerManagePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('q') || '';

  const { data: customersData, loading } = useFetch(
    async () => {
      const res = await getUsers({
        q: search,
        role: 'CUSTOMER',
        page,
        limit: 20,
      });
      return res;
    },
    [page, search]
  );

  const columns = [
    {
      key: 'full_name',
      header: 'Tên',
      width: '200px',
    },
    {
      key: 'email',
      header: 'Email',
      width: '200px',
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      width: '150px',
      render: (v) => v || '-',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '130px',
      render: (v) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${USER_STATUS_COLORS[v]}`}>
          {USER_STATUS_LABELS[v]}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Ngày tham gia',
      width: '150px',
      render: (v) => formatDate(v, 'short'),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: '120px',
      render: (_, row) => (
        <Link
          to={`/admin/customers/${row.id}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          Chi tiết <ChevronRight size={14} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý khách hàng</h1>
        <p className="text-gray-600 mt-1">Danh sách khách hàng</p>
      </div>

      <div className="flex-1 relative mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearchParams({ q: e.target.value, page: '1' })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <DataTable
        columns={columns}
        data={customersData?.data || []}
        loading={loading}
        page={page}
        totalPages={customersData?.totalPages || 1}
        onPageChange={(p) => setSearchParams({ page: p.toString(), q: search })}
      />
    </div>
  );
};

export default CustomerManagePage;
