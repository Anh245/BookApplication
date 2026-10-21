/**
 * Inventory Service - Manages Book Stock and Inventory Transactions
 * Base URL: Gateway /api/inventory
 */

import { API_CONFIG, createHeaders } from '../apiConfig';
import {
  InventoryResponse,
  InventoryTransactionResponse,
  ImportInventoryRequest,
  AdjustInventoryRequest,
  DeductInventoryRequest,
  RestoreInventoryRequest,
} from '../../types/api.types';

class InventoryService {
  private baseUrl = API_CONFIG.INVENTORY_SERVICE.BASE_URL;

  // ========== INVENTORY ENDPOINTS ==========

  /**
   * Get all inventory records
   * GET /
   */
  async getAllInventory(): Promise<InventoryResponse[]> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }

    return response.json();
  }

  /**
   * Get inventory for specific book
   * GET /{bookId}
   */
  async getInventory(bookId: number): Promise<InventoryResponse> {
    const response = await fetch(`${this.baseUrl}/${bookId}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Inventory not found for book: ${bookId}`);
    }

    return response.json();
  }

  /**
   * Get batch inventory for multiple books
   * Gọi GET /{bookId} cho từng sách
   */
  async getBatchInventory(bookIds: number[]): Promise<InventoryResponse[]> {
    return Promise.all(bookIds.map(id => this.getInventory(id)));
  }

  /**
   * Get low stock items (stock below threshold)
   * GET /low-stock?threshold=5
   */
  async getLowStockItems(threshold: number = 5): Promise<InventoryResponse[]> {
    const response = await fetch(`${this.baseUrl}/low-stock?threshold=${threshold}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch low stock items');
    }

    return response.json();
  }

  /**
   * Get out of stock items (quantity = 0)
   * GET /low-stock?threshold=0
   */
  async getOutOfStockItems(): Promise<InventoryResponse[]> {
    return this.getLowStockItems(0);
  }

  /**
   * Check if book is in stock
   * GET /{bookId}/in-stock
   */
  async isInStock(bookId: number, quantity: number = 1): Promise<boolean> {
    try {
      const inventory = await this.getInventory(bookId);
      return inventory.quantity >= quantity;
    } catch {
      return false;
    }
  }

  // ========== TRANSACTION ENDPOINTS ==========

  /**
   * Get inventory transactions
   * GET /transactions?bookId=1
   */
  async getTransactions(
    bookId?: number,
    type?: string,
    limit: number = 50
  ): Promise<InventoryTransactionResponse[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (bookId) params.append('bookId', bookId.toString());
    if (type) params.append('type', type);

    const response = await fetch(`${this.baseUrl}/transactions?${params}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    return response.json();
  }

  /**
   * Get transaction by ID
   * Tìm trong GET /transactions
   */
  async getTransaction(id: number): Promise<InventoryTransactionResponse> {
    const transactions = await this.getTransactions();
    const transaction = transactions.find(item => item.id === id);
    if (!transaction) throw new Error('Không tìm thấy giao dịch trong lịch sử hiện có.');
    return transaction;
  }

  // ========== IMPORT/ADJUSTMENT ENDPOINTS ==========

  /**
   * Import inventory (staff/admin only)
   * POST /import
   */
  async importInventory(data: ImportInventoryRequest): Promise<InventoryResponse> {
    const response = await fetch(`${this.baseUrl}/import`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import inventory');
    }

    return response.json();
  }

  /**
   * Import multiple items at once
   * Gọi POST /import tuần tự cho từng phần tử; không phải giao dịch batch.
   */
  async batchImportInventory(
    items: ImportInventoryRequest[]
  ): Promise<InventoryResponse[]> {
    const results: InventoryResponse[] = [];
    for (const item of items) results.push(await this.importInventory(item));
    return results;
  }

  /**
   * Adjust inventory (staff/admin only)
   * POST /adjust
   */
  async adjustInventory(data: AdjustInventoryRequest): Promise<InventoryResponse> {
    const response = await fetch(`${this.baseUrl}/adjust`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to adjust inventory');
    }

    return response.json();
  }

  // ========== ORDER-RELATED ENDPOINTS ==========

  /**
   * Deduct inventory when order is placed
   * Chưa có API public cho chức năng này.
   */
  async deductInventory(orderId: number, data: DeductInventoryRequest): Promise<void> {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }

  /**
   * Restore inventory when order is cancelled
   * Chưa có API public cho chức năng này.
   */
  async restoreInventory(orderId: number, data: RestoreInventoryRequest): Promise<void> {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }

  /**
   * Get transaction history for specific order
   * Chưa có API public cho chức năng này.
   */
  async getOrderTransactions(orderId: number): Promise<InventoryTransactionResponse[]> {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }

  // ========== ANALYTICS ENDPOINTS ==========

  /**
   * Get inventory statistics
   * Tổng hợp từ GET /api/inventory
   */
  async getInventoryStats(): Promise<{
    totalItems: number;
    totalQuantity: number;
    outOfStockCount: number;
    lowStockCount: number;
  }> {
    const items = await this.getAllInventory();
    return { totalItems: items.length, totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0), outOfStockCount: items.filter(item => item.quantity === 0).length, lowStockCount: items.filter(item => item.quantity <= 5).length };
  }

  /**
   * Get most imported books
   * Chưa có API public cho chức năng này.
   */
  async getMostImportedBooks(limit: number = 10): Promise<
    Array<{
      bookId: number;
      title: string;
      totalImported: number;
    }>
  > {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }

  /**
   * Get fast-moving inventory (most sold)
   * Chưa có API public cho chức năng này.
   */
  async getFastMovingBooks(limit: number = 10): Promise<
    Array<{
      bookId: number;
      title: string;
      totalSold: number;
      currentStock: number;
    }>
  > {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
