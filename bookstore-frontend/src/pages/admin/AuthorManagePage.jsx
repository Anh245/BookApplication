import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from '../../api/services/authorApi';
import CrudTable from '../../components/features/CrudTable';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import Button from '../../components/common/Button';

const authorSchema = z.object({
  name: z.string().min(2, 'Tên phải ít nhất 2 ký tự'),
  biography: z.string().optional(),
});

const AuthorManagePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('q') || '';

  const { data: authorsData, loading, refetch } = useFetch(
    async () => {
      const res = await getAuthors({ q: search, page, limit: 10 });
      return res;
    },
    [page, search]
  );

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(authorSchema),
    defaultValues: editingItem || {},
  });

  const handleAdd = () => {
    setEditingItem(null);
    reset({});
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    reset(item);
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingItem) {
        await updateAuthor(editingItem.id, data);
        showToast({ type: 'success', message: 'Cập nhật thành công' });
      } else {
        await createAuthor(data);
        showToast({ type: 'success', message: 'Thêm mới thành công' });
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      showToast({ type: 'error', message: err?.message || 'Lỗi' });
    }
  };

  const columns = [
    { key: 'name', header: 'Tên', width: '200px' },
    {
      key: 'biography',
      header: 'Tiểu sử',
      width: '300px',
      render: (value) => value ? value.substring(0, 50) + '...' : '-',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý tác giả</h1>
        <p className="text-gray-600 mt-1">Quản lý danh sách tác giả</p>
      </div>

      <CrudTable
        data={authorsData?.data || []}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={authorsData?.totalPages || 1}
        onPageChange={(p) => setSearchParams({ page: p.toString(), q: search })}
        onSearch={(q) => setSearchParams({ q })}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => deleteAuthor(id).then(refetch).catch((err) => showToast({ type: 'error', message: err?.message }))}
        addButtonLabel="Thêm tác giả"
      />

      {isModalOpen && (
        <Modal title={editingItem ? 'Chỉnh sửa tác giả' : 'Thêm tác giả'} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Tên" required error={errors.name?.message}>
              <input
                {...register('name')}
                type="text"
                placeholder="Tên tác giả"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Tiểu sử">
              <textarea
                {...register('biography')}
                placeholder="Tiểu sử tác giả"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
                {editingItem ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AuthorManagePage;
