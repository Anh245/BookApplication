/**
 * API Configuration for all Backend Services
 * Configures URLs, headers, and utilities for API communication
 */

import { GATEWAY_API_URL } from './gatewayConfig';

export const API_CONFIG = {
  CATALOG_SERVICE: {
    BASE_URL: `${GATEWAY_API_URL}/catalog`,
    TIMEOUT: 10000,
  },
  USER_SERVICE: {
    BASE_URL: GATEWAY_API_URL,
    TIMEOUT: 10000,
  },
  ORDER_SERVICE: {
    BASE_URL: GATEWAY_API_URL,
    TIMEOUT: 10000,
  },
  INVENTORY_SERVICE: {
    BASE_URL: `${GATEWAY_API_URL}/inventory`,
    TIMEOUT: 10000,
  },
};

/**
 * Get JWT token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * Get refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

/**
 * Get userId from localStorage
 */
export const getUserId = (): string | null => {
  return localStorage.getItem('userId');
};

/**
 * Create headers with proper content-type and auth
 */
export const createHeaders = (includeAuth = false): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Clear all auth data from localStorage
 */
export const clearAuthData = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('user');
};

/**
 * Save auth tokens and user info to localStorage
 */
export const saveAuthData = (data: {
  accessToken: string;
  refreshToken?: string;
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
}): void => {
  localStorage.setItem('accessToken', data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }
  localStorage.setItem('userId', data.userId.toString());
  localStorage.setItem('user', JSON.stringify({
    userId: data.userId,
    username: data.username,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
  }));
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('accessToken');
};

/**
 * Get user role
 */
export const getUserRole = (): string | null => {
  const user = getCurrentUser();
  return user?.role || null;
};
