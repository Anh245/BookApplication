import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';
import { catalogParams, mapPage } from '../adapters';

export const getCategories = (params = {}) => {
  return makeRequest('getCategories', [params], () =>
    axiosClient.get(ENDPOINTS.CATEGORIES.LIST, { params: catalogParams(params) }).then(page => mapPage(page))
  );
};

export const getCategoryDetail = (id) => {
  return makeRequest('getCategoryDetail', [id], () =>
    axiosClient.get(ENDPOINTS.CATEGORIES.DETAIL(id))
  );
};

export const createCategory = (data) => {
  return makeRequest('createCategory', [data], () =>
    axiosClient.post(ENDPOINTS.CATEGORIES.CREATE, data)
  );
};

export const updateCategory = (id, data) => {
  return makeRequest('updateCategory', [id, data], () =>
    axiosClient.put(ENDPOINTS.CATEGORIES.UPDATE(id), data)
  );
};

export const deleteCategory = (id) => {
  return makeRequest('deleteCategory', [id], () =>
    axiosClient.delete(ENDPOINTS.CATEGORIES.DELETE(id))
  );
};
