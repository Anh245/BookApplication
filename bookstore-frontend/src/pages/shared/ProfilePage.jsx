import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateUserProfile, changePassword } from '../../api/services/userApi';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import Spinner from '../../components/common/Spinner';

/**
 * ProfilePage: Hồ sơ người dùng
 * - Thông tin cá nhân (dùng chung cho CUSTOMER, STAFF, ADMIN)
 * - Đổi mật khẩu
 */
const profileSchema = z.object({
  fullName: z.string().min(2, 'Tên phải ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});

const ProfilePage = () => {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
    reset: resetPassword,
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data) => {
    try {
      await updateUserProfile(data);
      showToast({
        type: 'success',
        message: 'Cập nhật hồ sơ thành công',
      });
    } catch (err) {
      showToast({
        type: 'error',
        message: err?.message || 'Cập nhật hồ sơ thất bại',
      });
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      await changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      showToast({
        type: 'success',
        message: 'Đổi mật khẩu thành công',
      });
      resetPassword();
    } catch (err) {
      showToast({
        type: 'error',
        message: err?.message || 'Đổi mật khẩu thất bại',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <p className="text-gray-600 mt-1">Quản lý thông tin và bảo mật tài khoản</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Thông tin cá nhân
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'password'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Đổi mật khẩu
        </button>
      </div>

      {/* Content */}
      <div className="max-w-2xl">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                label="Họ và tên"
                required
                error={profileErrors.fullName?.message}
              >
                <input
                  {...registerProfile('fullName')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <FormField
                label="Email"
                required
                error={profileErrors.email?.message}
              >
                <input
                  {...registerProfile('email')}
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <FormField
                label="Số điện thoại"
                error={profileErrors.phone?.message}
              >
                <input
                  {...registerProfile('phone')}
                  type="tel"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={profileSubmitting}
                disabled={profileSubmitting}
              >
                Lưu thay đổi
              </Button>
            </form>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                label="Mật khẩu hiện tại"
                required
                error={passwordErrors.currentPassword?.message}
              >
                <input
                  {...registerPassword('currentPassword')}
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <FormField
                label="Mật khẩu mới"
                required
                error={passwordErrors.newPassword?.message}
              >
                <input
                  {...registerPassword('newPassword')}
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <FormField
                label="Xác nhận mật khẩu mới"
                required
                error={passwordErrors.confirmPassword?.message}
              >
                <input
                  {...registerPassword('confirmPassword')}
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={passwordSubmitting}
                disabled={passwordSubmitting}
              >
                Đổi mật khẩu
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
