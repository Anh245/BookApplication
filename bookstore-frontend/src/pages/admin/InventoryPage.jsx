import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  Button,
  DataTable,
  SearchInput,
  Select,
  EmptyState,
  ErrorState,
  Modal,
  FormField,
  Input,
  Textarea,
  Card,
  PageHeader,
  Badge,
} from '../../components/ui';
import { bookApi, inventoryApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';

/**
 * InventoryPage Component
 * Manage inventory: view stock, import goods, track history
 */
const InventoryPage = () => {
  const { showToast } = useToast();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [importQuantity, setImportQuantity] = useState('');
  const [importing, setImporting] = useState(false);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const params = {
          ...(searchTerm && { search: searchTerm }),
          limit: 50,
        };
        const data = await bookApi.getBooks(params);
        let booksList = Array.isArray(data) ? data : data?.data || [];
        const stocks = await inventoryApi.getInventory();
        const quantities = new Map(stocks.map(stock => [stock.bookId, stock.quantity]));
        booksList = booksList.map(book => ({ ...book, stock_quantity: quantities.get(book.id) ?? 0 }));

        if (filterLowStock) {
          booksList = booksList.filter(b => b.stock_quantity <= 5);
        }

        setBooks(booksList);
        setError(null);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchBooks, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterLowStock]);

  const handleImport = async () => {
    if (!selectedBook || !importQuantity) {
      showToast('error', 'Please select book and quantity');
      return;
    }

    try {
      setImporting(true);
      await inventoryApi.importStock({
        book_id: selectedBook.id,
        quantity: parseInt(importQuantity),
        note: `Manual import`,
      });

      // Update local state
      setBooks(books.map(b =>
        b.id === selectedBook.id
          ? { ...b, stock_quantity: b.stock_quantity + parseInt(importQuantity) }
          : b
      ));

      showToast('success', `Imported ${importQuantity} units`);
      setImportModalOpen(false);
      setImportQuantity('');
      setSelectedBook(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to import');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      header: 'Book',
      accessor: 'title',
      render: (row) => (
        <div className="max-w-xs">
          <p className="font-medium text-body-sm text-ink dark:text-ink line-clamp-1">
            {row.title}
          </p>
          <p className="text-label text-ink-muted dark:text-ink-muted">
            {row.category?.name}
          </p>
        </div>
      ),
    },
    {
      header: 'Stock',
      accessor: 'stock_quantity',
      render: (row) => (
        <div>
          <p className="font-bold text-body-md text-ink dark:text-ink">
            {row.stock_quantity}
          </p>
          {row.stock_quantity <= 5 && (
            <Badge variant="warning" size="sm">Low</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Price',
      accessor: 'price',
      render: (row) => (
        <p className="text-body-sm text-ink dark:text-ink">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(row.price)}
        </p>
      ),
    },
    {
      header: 'Total Value',
      accessor: 'id',
      render: (row) => (
        <p className="text-body-sm font-medium text-primary dark:text-primary-light">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(row.price * row.stock_quantity)}
        </p>
      ),
    },
    {
      header: 'Action',
      accessor: 'id',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSelectedBook(row);
            setImportModalOpen(true);
          }}
        >
          Import
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inventory"
        subtitle="Manage product stock levels"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 space-y-2">
          <p className="text-body-sm text-ink-muted dark:text-ink-muted">Total Books</p>
          <p className="text-heading-lg font-bold text-ink dark:text-ink">
            {books.length}
          </p>
        </Card>
        <Card className="p-6 space-y-2">
          <p className="text-body-sm text-ink-muted dark:text-ink-muted">Low Stock</p>
          <p className="text-heading-lg font-bold text-warning">
            {books.filter(b => b.stock_quantity <= 5 && b.stock_quantity > 0).length}
          </p>
        </Card>
        <Card className="p-6 space-y-2">
          <p className="text-body-sm text-ink-muted dark:text-ink-muted">Out of Stock</p>
          <p className="text-heading-lg font-bold text-danger">
            {books.filter(b => b.stock_quantity === 0).length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <SearchInput
          placeholder="Search books..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1"
        />
        <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-button cursor-pointer hover:bg-surface-muted transition-colors dark:border-border dark:hover:bg-surface">
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="accent-primary dark:accent-primary-light"
          />
          <span className="text-body-sm font-medium text-ink dark:text-ink">Low Stock Only</span>
        </label>
      </div>

      {/* Inventory Table */}
      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : books.length === 0 ? (
        <EmptyState title="No items found" />
      ) : (
        <DataTable columns={columns} data={books} loading={loading} />
      )}

      {/* Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title={`Import Stock: ${selectedBook?.title}`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setImportModalOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              loading={importing}
            >
              Import
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Current Stock" required>
            <Input
              type="number"
              value={selectedBook?.stock_quantity || 0}
              disabled
            />
          </FormField>

          <FormField label="Import Quantity" required>
            <Input
              type="number"
              min="1"
              value={importQuantity}
              onChange={(e) => setImportQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </FormField>

          <FormField label="After Import">
            <Input
              type="number"
              value={(selectedBook?.stock_quantity || 0) + (parseInt(importQuantity) || 0)}
              disabled
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryPage;
