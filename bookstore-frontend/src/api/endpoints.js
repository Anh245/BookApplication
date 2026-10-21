/**
 * Tất cả đường dẫn API định nghĩa tại đây
 * Các đường dẫn public của backend, đi qua API Gateway.
 * Chỉ sửa file này khi đổi API path, component không chứa chuỗi URL
 */

export { GATEWAY_API_URL as BASE_URL } from './gatewayConfig';

export const ENDPOINTS = {
  // ========== AUTH ==========
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/users/me',
    PROFILE: '/users/profile',
    LOGOUT: '/auth/logout',
  },

  // ========== BOOKS ==========
  BOOKS: {
    LIST: '/catalog/books',
    DETAIL: (id) => `/catalog/books/${id}`,
    SEARCH: '/catalog/search',
  },

  // ========== CATEGORIES ==========
  CATEGORIES: {
    LIST: '/catalog/categories',
    DETAIL: (id) => `/catalog/categories/${id}`,
    CREATE: '/catalog/categories',
    UPDATE: (id) => `/catalog/categories/${id}`,
    DELETE: (id) => `/catalog/categories/${id}`,
  },

  // ========== AUTHORS ==========
  AUTHORS: {
    LIST: '/catalog/authors',
    DETAIL: (id) => `/catalog/authors/${id}`,
    CREATE: '/catalog/authors',
    UPDATE: (id) => `/catalog/authors/${id}`,
    DELETE: (id) => `/catalog/authors/${id}`,
  },

  // ========== PUBLISHERS ==========
  PUBLISHERS: {
    LIST: '/catalog/publishers',
    DETAIL: (id) => `/catalog/publishers/${id}`,
    CREATE: '/catalog/publishers',
    UPDATE: (id) => `/catalog/publishers/${id}`,
    DELETE: (id) => `/catalog/publishers/${id}`,
  },

  // ========== CART ==========
  CART: {
    GET: '/cart',
    ADD_ITEM: '/cart/items',
    UPDATE_ITEM: (bookId) => `/cart/items/${bookId}`,
    REMOVE_ITEM: (bookId) => `/cart/items/${bookId}`,
    CLEAR: '/cart',
  },

  // ========== ORDERS ==========
  ORDERS: {
    LIST: '/orders',
    MY: '/orders/my',
    DETAIL: (id) => `/orders/${id}`,
    CREATE: '/orders',
    CANCEL: (id) => `/orders/${id}/cancel`,
    STATUS: (id) => `/orders/${id}/status`,
  },

  // ========== PAYMENTS ==========
  PAYMENTS: {
    CREATE: (orderId) => `/orders/${orderId}/payments`,
    HISTORY: (orderId) => `/orders/${orderId}/payments`,
  },

  // ========== INVENTORY ==========
  INVENTORY: {
    LIST: '/inventory',
    IMPORT: '/inventory/import',
    HISTORY: '/inventory/transactions',
    ADJUST: '/inventory/adjust',
    LOW_STOCK: '/inventory/low-stock',
  },

  // ========== USERS ==========
  USERS: {
    LIST: '/admin/users',
    DETAIL: (id) => `/admin/users/${id}`,
    CREATE: '/admin/users',
    UPDATE: (id) => `/admin/users/${id}`,
    UPDATE_ROLE: (id) => `/admin/users/${id}/role`,
    UPDATE_STATUS: (id) => `/admin/users/${id}/status`,
    DELETE: (id) => `/admin/users/${id}`,
    UPDATE_PASSWORD: '/users/change-password',
  },

  // ========== AI CHAT ==========
  AI: {
    CHAT: '/ai/chat',
    SUGGEST_BOOKS: '/ai/recommendations',
    SEARCH: '/ai/search',
  },
};
