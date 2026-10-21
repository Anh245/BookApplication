import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { getPublishers, createPublisher, updatePublisher, deletePublisher } from '../../api/services/publisherApi';
import CrudTable from '../../components/features/CrudTable';
import Modal from '../../components/common/Modal';
import FormField from '../../components/common/FormField';
import Button from '../../components/common/Button';

const publisherSchema = z.object({
  name: z.string().min(2, 'Tên phải ít nhất 2 ký tự'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
});

const PublisherManagePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('q') || '';

  const { data: publishersData, loading, refetch } = useFetch(
    async () => {
      const res = await getPublishers({ q: search, page, limit: 10 });
      return res;
    },
    [page, search]
  );

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(publisherSchema),
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
        await updatePublisher(editingItem.id, data);
        showToast({ type: 'success', message: 'Cập nhật thành công' });
      } else {
        await createPublisher(data);
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
    { key: 'address', header: 'Địa chỉ', width: '250px', render: (v) => v || '-' },
    { key: 'phone', header: 'Điện thoại', width: '150px', render: (v) => v || '-' },
    { key: 'email', header: 'Email', width: '200px', render: (v) => v || '-' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý nhà xuất bản</h1>
        <p className="text-gray-600 mt-1">Quản lý danh sách nhà xuất bản</p>
      </div>

      <CrudTable
        data={publishersData?.data || []}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={publishersData?.totalPages || 1}
        onPageChange={(p) => setSearchParams({ page: p.toString(), q: search })}
        onSearch={(q) => setSearchParams({ q })}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => deletePublisher(id).then(refetch).catch((err) => showToast({ type: 'error', message: err?.message }))}
        addButtonLabel="Thêm nhà xuất bản"
      />

      {isModalOpen && (
        <Modal title={editingItem ? 'Chỉnh sửa nhà xuất bản' : 'Thêm nhà xuất bản'} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Tên" required error={errors.name?.message}>
              <input
                {...register('name')}
                type="text"
                placeholder="Tên nhà xuất bản"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Địa chỉ">
              <input
                {...register('address')}
                type="text"
                placeholder="Địa chỉ"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Điện thoại">
              <input
                {...register('phone')}
                type="tel"
                placeholder="Số điện thoại"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                placeholder="Email"
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

export default PublisherManagePage;
