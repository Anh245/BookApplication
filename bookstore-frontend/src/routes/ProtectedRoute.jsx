import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLoading from '../components/system/AppLoading';
import ForbiddenPage from '../pages/system/ForbiddenPage';

/**
 * ProtectedRoute: bảo vệ route theo vai trò
 * - Nếu chưa đăng nhập: chuyển /login?redirect=...
 * - Nếu không đủ quyền: hiện 403
 * - Nếu đang load: hiện màn hình chờ
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppLoading />;
  }

  if (!isAuthenticated) {
    const redirectUrl = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <ForbiddenPage />;
  }

  return children;
};

export default ProtectedRoute;
