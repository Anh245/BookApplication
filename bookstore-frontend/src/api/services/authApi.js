import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';
import { unwrap, mapUser } from '../adapters';

export const login = (username, password) => {
  return makeRequest('login', [username, password], () =>
    axiosClient.post(ENDPOINTS.AUTH.LOGIN, { usernameOrEmail: username, password }).then(response => {
      const data = unwrap(response);
      return { ...data, token: data.accessToken, user: mapUser(data) };
    })
  );
};

export const register = (data) => {
  return makeRequest('register', [data], () =>
    axiosClient.post(ENDPOINTS.AUTH.REGISTER, { ...data, fullName: data.fullName ?? data.full_name }).then(unwrap)
  );
};

export const getMe = () => {
  return makeRequest('getMe', [], () => axiosClient.get(ENDPOINTS.AUTH.ME).then(unwrap).then(mapUser));
};

export const changePassword = (data) => {
  return makeRequest('changePassword', [data], () =>
    axiosClient.put(ENDPOINTS.USERS.UPDATE_PASSWORD, { oldPassword: data.oldPassword ?? data.current_password, newPassword: data.newPassword ?? data.new_password }).then(unwrap)
  );
};

export const updateProfile = (data) => {
  return makeRequest('updateProfile', [data], () =>
    axiosClient.put(ENDPOINTS.AUTH.PROFILE, { ...data, fullName: data.fullName ?? data.full_name }).then(unwrap).then(mapUser)
  );
};

export const logout = () => axiosClient.post(ENDPOINTS.AUTH.LOGOUT);
