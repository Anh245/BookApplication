import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AppLoading from '../components/system/AppLoading';
import AuthLayout from '../layouts/AuthLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import AdminLayout from '../layouts/AdminLayout';

// ========== LAZY LOAD PAGES ==========
// Auth
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));

// Customer
const HomePage = lazy(() => import('../pages/customer/HomePage'));
const BookListPage = lazy(() => import('../pages/customer/BookListPage'));
const BookDetailPage = lazy(() => import('../pages/customer/BookDetailPage'));
const CartPage = lazy(() => import('../pages/customer/CartPage'));
const CheckoutPage = lazy(() => import('../pages/customer/CheckoutPage'));
const OrderListPage = lazy(() => import('../pages/customer/OrderListPage'));
const OrderDetailPage = lazy(() => import('../pages/customer/OrderDetailPage'));
const ProfilePage = lazy(() => import('../pages/shared/ProfilePage'));

// Admin
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const BookManagePage = lazy(() => import('../pages/admin/BookManagePage'));
const CategoryManagePage = lazy(() => import('../pages/admin/CategoryManagePage'));
const AuthorManagePage = lazy(() => import('../pages/admin/AuthorManagePage'));
const PublisherManagePage = lazy(() => import('../pages/admin/PublisherManagePage'));
const InventoryPage = lazy(() => import('../pages/admin/InventoryPage'));
const OrderManagePage = lazy(() => import('../pages/admin/OrderManagePage'));
const AdminOrderDetailPage = lazy(() => import('../pages/admin/AdminOrderDetailPage'));
const CustomerManagePage = lazy(() => import('../pages/admin/CustomerManagePage'));
const UserManagePage = lazy(() => import('../pages/admin/UserManagePage'));
const StatisticsPage = lazy(() => import('../pages/admin/StatisticsPage'));

// System
const NotFoundPage = lazy(() => import('../pages/system/NotFoundPage'));
const ServerErrorPage = lazy(() => import('../pages/system/ServerErrorPage'));
const TailwindCheck = lazy(() => import('../pages/system/TailwindCheck'));
const APITestPage = lazy(() => import('../pages/dev/APITestPage'));

const AppRoutes = () => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <AppLoading />;
  }

  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="books" element={<BookListPage />} />
          <Route path="books/:id" element={<BookDetailPage />} />
        </Route>

        {/* ========== AUTH ROUTES ========== */}
        <Route path="/" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        {/* ========== CUSTOMER ROUTES ========== */}
        <Route
          path="/"
          element={
            <ProtectedRoute roles={['CUSTOMER']}>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
        </Route>

        {/* SHARED ROUTES */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProfilePage />} />
        </Route>

        {/* ========== ADMIN/STAFF ROUTES ========== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN', 'STAFF']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="books" element={<BookManagePage />} />
          <Route path="categories" element={<CategoryManagePage />} />
          <Route path="authors" element={<AuthorManagePage />} />
          <Route path="publishers" element={<PublisherManagePage />} />
          <Route path="customers" element={<CustomerManagePage />} />
          <Route path="users" element={<UserManagePage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrderManagePage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        </Route>

        {/* ========== DEV ROUTES ========== */}
        <Route path="/dev/tailwind-check" element={<TailwindCheck />} />
        <Route path="/dev/api-test" element={<APITestPage />} />

        {/* ========== SYSTEM ROUTES ========== */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
