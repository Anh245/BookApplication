import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/services/authApi';

const AuthContext = createContext(null);

/**
 * AuthProvider: quản lý trạng thái xác thực
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Khởi tạo: lấy ME nếu có token
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await authApi.getMe();
        setUser(data);
        setError(null);
      } catch (err) {
        // Token không hợp lệ
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  // Đăng nhập
  const login = async (username, password) => {
    try {
      setLoading(true);
      const data = await authApi.login(username, password);
      const newToken = data.token;
      const userData = data.user;

      localStorage.setItem('token', newToken);
      localStorage.setItem('accessToken', newToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', String(userData.id));
      setToken(newToken);
      setUser(userData);
      setError(null);

      return userData;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  // Đăng ký
  const register = async (data) => {
    try {
      setLoading(true);
      const result = await authApi.register(data);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật hồ sơ
  const updateProfile = async (data) => {
    try {
      const result = await authApi.updateProfile(data);
      setUser((prev) => ({ ...prev, ...result }));
      return result;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    register,
    updateProfile,
    isAuthenticated: !!token,
    userRole: user?.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook: useAuth
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};
