import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';
import { catalogParams, mapPage } from '../adapters';

export const getPublishers = (params = {}) => {
  return makeRequest('getPublishers', [params], () =>
    axiosClient.get(ENDPOINTS.PUBLISHERS.LIST, { params: catalogParams(params) }).then(page => mapPage(page))
  );
};

export const getPublisherDetail = (id) => {
  return makeRequest('getPublisherDetail', [id], () =>
    axiosClient.get(ENDPOINTS.PUBLISHERS.DETAIL(id))
  );
};

export const createPublisher = (data) => {
  return makeRequest('createPublisher', [data], () =>
    axiosClient.post(ENDPOINTS.PUBLISHERS.CREATE, data)
  );
};

export const updatePublisher = (id, data) => {
  return makeRequest('updatePublisher', [id, data], () =>
    axiosClient.put(ENDPOINTS.PUBLISHERS.UPDATE(id), data)
  );
};

export const deletePublisher = (id) => {
  return makeRequest('deletePublisher', [id], () =>
    axiosClient.delete(ENDPOINTS.PUBLISHERS.DELETE(id))
  );
};
