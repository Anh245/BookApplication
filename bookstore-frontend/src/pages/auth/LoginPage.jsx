import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isInternalUrl } from '../../utils/helpers';
import { isMockEnabled } from '../../api/request';
import { DEMO_ACCOUNTS } from '../../mock/data/users';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState('');
  const { login, isAuthenticated, userRole, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    const presetUsername = searchParams.get('username');
    if (presetUsername) {
      setValue('username', presetUsername);
    }
  }, [searchParams, setValue]);

  // Nếu đã đăng nhập thì chuyển về trang phù hợp
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const redirect = searchParams.get('redirect');
      if (redirect && isInternalUrl(redirect)) {
        navigate(redirect);
      } else if (userRole === 'CUSTOMER') {
        navigate('/');
      } else {
        navigate('/admin');
      }
    }
  }, [isAuthenticated, authLoading, userRole, navigate, searchParams]);

  const onSubmit = async (data) => {
    try {
      setShowError('');
      await login(data.username, data.password);
      showToast({ type: 'success', message: 'Đăng nhập thành công' });

      const redirect = searchParams.get('redirect');
      if (redirect && isInternalUrl(redirect)) {
        navigate(redirect);
      } else if (userRole === 'CUSTOMER') {
        navigate('/');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      const message = err?.message || 'Đăng nhập thất bại';

      if (err?.status === 403) {
        setShowError('Tài khoản đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
      } else if (err?.status === 401 || err?.status === 400) {
        setShowError('Tên đăng nhập hoặc mật khẩu không chính xác');
        setValue('password', '');
      } else {
        setShowError('Không thể kết nối, vui lòng thử lại');
      }

      showToast({ type: 'error', message });
    }
  };

  const handleFillDemo = (acc) => {
    setValue('username', acc.username);
    setValue('password', acc.password);
    setShowError('');
  };

  if (authLoading) {
    return <div className="py-12 text-center text-sm">Đang tải thông tin...</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1.5">Đăng nhập</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Chào mừng bạn quay trở lại với Phương Anh Bookstore
        </p>
      </div>

      {/* Error message box */}
      {showError && (
        <div
          className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5"
          role="alert"
          aria-live="polite"
        >
          <span className="text-base flex-shrink-0">⚠️</span>
          <p className="font-medium leading-relaxed">{showError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username */}
        <FormField label="Tên đăng nhập / Email" required error={errors.username?.message}>
          <input
            {...register('username')}
            type="text"
            placeholder="Nhập username (admin, customer1...)"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
        </FormField>

        {/* Password */}
        <FormField label="Mật khẩu" required error={errors.password?.message}>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              tabIndex="-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FormField>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 shadow-md shadow-indigo-600/20"
        >
          Đăng nhập
        </Button>
      </form>

      {/* Demo Accounts Quick-Fill Box (Hiển thị khi bật mock data theo Prompt 25) */}
      {isMockEnabled() && (
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/80">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5">
            <KeyRound size={14} />
            <span>Tài khoản dùng thử Demo (Bấm để điền):</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {DEMO_ACCOUNTS.map((acc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleFillDemo(acc)}
                className="p-2 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600">
                    {acc.username}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-semibold">
                    {acc.role}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{acc.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Link to register */}
      <div className="mt-5 text-center text-xs sm:text-sm">
        <span className="text-gray-500 dark:text-gray-400">Chưa có tài khoản? </span>
        <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-bold">
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
