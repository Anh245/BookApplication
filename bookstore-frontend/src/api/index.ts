import catalogService from './services/catalogService';
import authService from './services/authService';
import orderService from './services/orderService';
import inventoryService from './services/inventoryService';
/**
 * Central export point for all API services
 * Import all services from here for easier access
 */

// Config & Types
export * from './apiConfig';
export { default as axiosClient } from './axiosClient';

// Services
export { default as catalogService } from './services/catalogService';
export { default as authService } from './services/authService';
export { default as orderService } from './services/orderService';
export { default as inventoryService } from './services/inventoryService';

/**
 * Quick access to all services
 * Usage: import { services } from '@/api'
 *        services.catalog.searchBooks()
 */
export const services = {
  catalog: catalogService,
  auth: authService,
  order: orderService,
  inventory: inventoryService,
};
