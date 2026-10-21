/**
 * Order Service - Manages Cart, Orders, and Payments
 * Base URL: Gateway /api
 */

import { API_CONFIG, createHeaders, getUserId } from '../apiConfig';
import {
  CartResponse,
  CartItemRequest,
  OrderResponse,
  PlaceOrderRequest,
  PaymentResponse,
  PaymentRequest,
} from '../../types/api.types';

class OrderService {
  private baseUrl = API_CONFIG.ORDER_SERVICE.BASE_URL;

  // ========== CART ENDPOINTS ==========

  /**
   * Get user's cart
   * GET /cart
   */
  async getCart(): Promise<CartResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/cart`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cart');
    }

    return response.json();
  }

  /**
   * Add item to cart
   * POST /cart/items
   */
  async addToCart(data: CartItemRequest): Promise<CartResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/cart/items`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add item to cart');
    }

    return response.json();
  }

  /**
   * Update cart item quantity
   * PUT /cart/items/{bookId}
   */
  async updateCartQuantity(bookId: number, quantity: number): Promise<CartResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/cart/items/${bookId}`, {
      method: 'PUT',
      headers: createHeaders(true),
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update cart');
    }

    return response.json();
  }

  /**
   * Remove item from cart
   * DELETE /cart/items/{bookId}
   */
  async removeFromCart(bookId: number): Promise<CartResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/cart/items/${bookId}`, {
      method: 'DELETE',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to remove item from cart');
    }

    return response.json();
  }

  /**
   * Clear entire cart
   * DELETE /cart
   */
  async clearCart(): Promise<void> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/cart`, {
      method: 'DELETE',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to clear cart');
    }
  }

  // ========== ORDER ENDPOINTS ==========

  /**
   * Place new order
   * POST /orders
   */
  async placeOrder(data: PlaceOrderRequest): Promise<OrderResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to place order');
    }

    return response.json();
  }

  /**
   * Get my orders
   * GET /orders/my
   */
  async getMyOrders(): Promise<OrderResponse[]> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/orders/my`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    return response.json();
  }

  /**
   * Get order details
   * GET /orders/{id}
   */
  async getOrder(orderId: number): Promise<OrderResponse> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return response.json();
  }

  /**
   * Cancel order
   * POST /orders/{id}/cancel
   */
  async cancelOrder(orderId: number): Promise<OrderResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel order');
    }

    return response.json();
  }

  /**
   * Get order status history
   * Chưa có API public cho chức năng này.
   */
  async getOrderStatusHistory(orderId: number): Promise<Array<{
    status: string;
    changedAt: string;
    changedBy?: string;
  }>> {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }

  // ========== PAYMENT ENDPOINTS ==========

  /**
   * Create payment for order
   * POST /orders/{id}/payments
   */
  async createPayment(orderId: number, data: PaymentRequest): Promise<PaymentResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/orders/${orderId}/payments`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment');
    }

    return response.json();
  }

  /**
   * Get payment details
   * GET /payments/{id}
   */
  async getPayment(paymentId: number): Promise<PaymentResponse> {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }

  /**
   * Get payment history for order
   * GET /orders/{id}/payments
   */
  async getPaymentHistory(orderId: number): Promise<PaymentResponse[]> {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}/payments`, {
      method: 'GET',
      headers: createHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment history');
    }

    return response.json();
  }

  /**
   * Verify payment
   * Chưa có API public cho chức năng này.
   */
  async verifyPayment(paymentId: number, data?: any): Promise<PaymentResponse> {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }

  /**
   * Get payment info (for COD instruction)
   * Chưa có API public cho chức năng này.
   */
  async getPaymentInfo(orderId: number): Promise<{
    method: string;
    instruction: string;
    bankInfo?: any;
  }> {
    throw new Error('Chức năng này chưa có API public; thao tác kho theo đơn và xác minh thanh toán do backend xử lý.');
  }
}

export const orderService = new OrderService();
export default orderService;
