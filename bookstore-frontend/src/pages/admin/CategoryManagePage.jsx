import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Modal,
  FormField,
  Input,
  Textarea,
  ConfirmModal,
  PageHeader,
} from '../../components/ui';
import { categoryApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';

/**
 * CategoryManagePage Component
 * Manage book categories: create, edit, delete
 */
const CategoryManagePage = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await categoryApi.getCategories?.();
        setCategories(Array.isArray(data) ? data : data?.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleOpenForm = (category = null) => {
    if (category) {
      setEditingId(category.id);
      setFormData({ name: category.name, description: category.description || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '' });
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('error', 'Category name is required');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await categoryApi.updateCategory(editingId, formData);
        setCategories(categories.map(c =>
          c.id === editingId ? { ...c, ...formData } : c
        ));
        showToast('success', 'Category updated');
      } else {
        const newCategory = await categoryApi.createCategory(formData);
        setCategories([...categories, newCategory]);
        showToast('success', 'Category created');
      }

      setFormOpen(false);
      setFormData({ name: '', description: '' });
    } catch (err) {
      showToast('error', err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId) => {
    try {
      await categoryApi.deleteCategory(categoryId);
      setCategories(categories.filter(c => c.id !== categoryId));
      showToast('success', 'Category deleted');
      setDeleteConfirm(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to delete category');
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <p className="font-medium text-body-md text-ink dark:text-ink">
          {row.name}
        </p>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <p className="text-body-sm text-ink-muted dark:text-ink-muted line-clamp-2">
          {row.description || '-'}
        </p>
      ),
    },
    {
      header: 'Books',
      accessor: 'book_count',
      render: (row) => (
        <p className="text-body-sm font-medium text-primary dark:text-primary-light">
          {row.book_count || 0}
        </p>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Edit2}
            onClick={() => handleOpenForm(row)}
          />
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setDeleteConfirm(row.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Categories"
        subtitle="Manage book categories"
        actions={
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            onClick={() => handleOpenForm()}
          >
            Add Category
          </Button>
        }
      />

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories"
          description="Create your first category"
          action={() => handleOpenForm()}
          actionLabel="Add Category"
        />
      ) : (
        <DataTable columns={columns} data={categories} loading={loading} />
      )}

      {/* Form Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Category Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Fiction"
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this category..."
              rows={3}
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Delete Category?"
        message="This category will be deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

export default CategoryManagePage;
