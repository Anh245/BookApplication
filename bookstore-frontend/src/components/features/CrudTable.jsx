import React, { useState } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import DataTable from '../common/DataTable';
import Button from '../common/Button';
import ConfirmModal from '../common/ConfirmModal';

/**
 * CrudTable: Generic bảng CRUD cho các entity (categories, authors, publishers)
 * Cung cấp: thêm, sửa, xóa, tìm kiếm, phân trang
 */
const CrudTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  onPageChange,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
  searchPlaceholder = 'Tìm kiếm...',
  addButtonLabel = 'Thêm mới',
  emptyText = 'Không có dữ liệu',
  deleteConfirmTitle = 'Xác nhận xóa',
  deleteConfirmMessage = 'Bạn có chắc chắn muốn xóa mục này?',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleDeleteClick = (item) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      if (onDelete) {
        await onDelete(deleteTarget.id);
      }
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const actionColumns = [
    ...columns,
    {
      key: 'actions',
      header: 'Thao tác',
      width: '120px',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit && onEdit(row)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Sửa"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Xóa"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Header with search and add button */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={onAdd}
          icon={<Plus size={18} />}
          className="flex-shrink-0"
        >
          {addButtonLabel}
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={actionColumns}
        data={data}
        loading={loading}
        error={error}
        emptyText={emptyText}
        onRetry={onRetry}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmModal
          title={deleteConfirmTitle}
          message={deleteConfirmMessage}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isDeleting}
          confirmText="Xóa"
          confirmVariant="danger"
        />
      )}
    </>
  );
};

export default CrudTable;
