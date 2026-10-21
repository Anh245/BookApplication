import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';
import { unwrap, mapUser, mapPage } from '../adapters';
import { unsupportedApi } from '../gatewayConfig';
import { changePassword as updatePassword, updateProfile } from './authApi';

export const getUsers = (params = {}) => {
  return makeRequest('getUsers', [params], () =>
    axiosClient.get(ENDPOINTS.USERS.LIST, { params: { pageNo: Math.max(0, (params.page ?? 1) - 1), pageSize: params.limit ?? 20, keyword: params.search ?? params.q, role: params.role, status: params.status } }).then(unwrap).then(page => mapPage(page, mapUser))
  );
};

export const getUserDetail = (id) => {
  return makeRequest('getUsers', [], () => axiosClient.get(ENDPOINTS.USERS.DETAIL(id)).then(unwrap).then(mapUser));
};

export const createUser = (data) => {
  return makeRequest('register', [data], () =>
    unsupportedApi('Tạo người dùng bằng quyền quản trị')
  );
};

export const updateUser = (id, data) => {
  return makeRequest('updateProfile', [data], () =>
    unsupportedApi('Sửa hồ sơ người dùng khác')
  );
};

export const updateUserProfile = (data) => {
  return makeRequest('updateProfile', [data], () =>
    updateProfile(data)
  );
};

export const changePassword = (data) => {
  return makeRequest('changePassword', [data], () =>
    updatePassword(data)
  );
};

export const updateUserRole = (id, data) => {
  return makeRequest('updateUserRole', [id, data?.role || data], () =>
    axiosClient.patch(ENDPOINTS.USERS.UPDATE_ROLE(id), { role: data?.role ?? data }).then(unwrap).then(mapUser)
  );
};

export const updateUserStatus = (id, data) => {
  return makeRequest('updateUserStatus', [id, data?.status || data], () =>
    axiosClient.patch(ENDPOINTS.USERS.UPDATE_STATUS(id), { status: data?.status ?? data }).then(unwrap).then(mapUser)
  );
};

export const deleteUser = (id) => {
  return makeRequest('updateUserStatus', [id, 'LOCKED'], () =>
    unsupportedApi('Xóa người dùng')
  );
};
