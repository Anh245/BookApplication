import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';
import { catalogParams, mapPage } from '../adapters';

export const getAuthors = (params = {}) => {
  return makeRequest('getAuthors', [params], () =>
    axiosClient.get(ENDPOINTS.AUTHORS.LIST, { params: catalogParams(params) }).then(page => mapPage(page))
  );
};

export const getAuthorDetail = (id) => {
  return makeRequest('getAuthorDetail', [id], () =>
    axiosClient.get(ENDPOINTS.AUTHORS.DETAIL(id))
  );
};

export const createAuthor = (data) => {
  return makeRequest('createAuthor', [data], () =>
    axiosClient.post(ENDPOINTS.AUTHORS.CREATE, data)
  );
};

export const updateAuthor = (id, data) => {
  return makeRequest('updateAuthor', [id, data], () =>
    axiosClient.put(ENDPOINTS.AUTHORS.UPDATE(id), data)
  );
};

export const deleteAuthor = (id) => {
  return makeRequest('deleteAuthor', [id], () =>
    axiosClient.delete(ENDPOINTS.AUTHORS.DELETE(id))
  );
};
