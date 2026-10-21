import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  DataTable,
  SearchInput,
  Select,
  EmptyState,
  ErrorState,
  Skeleton,
  ConfirmModal,
  StatusBadge,
  PageHeader,
} from '../../components/ui';
import { bookApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';

/**
 * BookManagePage Component
 * Manage books: create, edit, delete
 */
const BookManagePage = () => {
  const { showToast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const params = {
          ...(searchTerm && { search: searchTerm }),
          ...(categoryFilter && { category_id: categoryFilter }),
          limit: 50,
        };
        const data = await bookApi.getBooks(params);
        setBooks(Array.isArray(data) ? data : data?.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchBooks, 300); // Debounce
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter]);

  // Fetch categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await bookApi.getCategories?.();
        setCategories(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  const handleDelete = async (bookId) => {
    try {
      setDeleting(true);
      await bookApi.deleteBook(bookId);
      setBooks(books.filter(b => b.id !== bookId));
      showToast('success', 'Book deleted successfully');
      setDeleteConfirm(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to delete book');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Title',
      accessor: 'title',
      render: (row) => (
        <div className="max-w-xs">
          <p className="font-medium text-body-sm text-ink dark:text-ink line-clamp-2">
            {row.title}
          </p>
        </div>
      ),
    },
    {
      header: 'Author',
      accessor: 'authors',
      render: (row) => (
        <p className="text-body-sm text-ink-muted dark:text-ink-muted">
          {row.authors?.map(a => a.name).join(', ') || '-'}
        </p>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <p className="text-body-sm text-ink dark:text-ink">
          {row.category?.name || '-'}
        </p>
      ),
    },
    {
      header: 'Price',
      accessor: 'price',
      render: (row) => (
        <p className="text-body-sm font-medium text-primary dark:text-primary-light">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(row.price)}
        </p>
      ),
    },
    {
      header: 'Stock',
      accessor: 'stock_quantity',
      render: (row) => (
        <StatusBadge
          type="order"
          value={
            row.stock_quantity > 10
              ? 'CONFIRMED'
              : row.stock_quantity > 0
                ? 'PREPARING'
                : 'CANCELLED'
          }
        />
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
            onClick={() => window.location.href = `/admin/books/${row.id}/edit`}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteConfirm(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Books"
        subtitle="Manage your book inventory"
        actions={
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            onClick={() => window.location.href = '/admin/books/new'}
          >
            Add Book
          </Button>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchInput
          placeholder="Search books..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <Select
          options={[
            { value: '', label: 'All Categories' },
            ...categories.map(c => ({ value: c.id, label: c.name })),
          ]}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : books.length === 0 && !loading ? (
        <EmptyState
          title="No books found"
          description="Start by adding your first book"
          action={() => window.location.href = '/admin/books/new'}
          actionLabel="Add Book"
        />
      ) : (
        <DataTable
          columns={columns}
          data={books}
          loading={loading}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Delete Book?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

export default BookManagePage;
