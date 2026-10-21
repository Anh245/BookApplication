// One backend entry point for both API client implementations.
export const GATEWAY_API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const unsupportedApi = (feature) => Promise.reject(
  new Error(`${feature} chưa được backend hỗ trợ.`)
);
