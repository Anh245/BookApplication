import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '../../components/common/Button';
import FormField from '../../components/common/FormField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isValidPhoneVN } from '../../utils/formatters';

/**
 * RegisterPage: trang đăng ký
 */
const registerSchema = z.object({
  full_name: z.string().min(1, 'Vui lòng nhập họ tên').min(3, 'Họ tên ít nhất 3 ký tự'),
  username: z.string()
    .min(4, 'Username ít nhất 4 ký tự')
    .max(50, 'Username tối đa 50 ký tự')
    .regex(/^\S+$/, 'Username không được chứa khoảng trắng'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional().refine(
    (val) => !val || isValidPhoneVN(val),
    'Số điện thoại VN không hợp lệ (ví dụ: 0912345678)'
  ),
  password: z.string()
    .min(8, 'Mật khẩu ít nhất 8 ký tự')
    .regex(/[a-z]/i, 'Mật khẩu phải chứa chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải chứa chữ số'),
  password_confirm: z.string(),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Mật khẩu không khớp',
  path: ['password_confirm'],
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('yếu');
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const password = watch('password');

  // Tính độ mạnh mật khẩu
  React.useEffect(() => {
    if (!password) return;

    let strength = 'yếu';
    if (password.length >= 8) {
      const hasNumber = /\d/.test(password);
      const hasLetter = /[a-z]/i.test(password);
      const hasSpecial = /[^a-z0-9]/i.test(password);

      if (hasNumber && hasLetter && hasSpecial && password.length >= 12) {
        strength = 'mạnh';
      } else if ((hasNumber && hasLetter) || password.length >= 10) {
        strength = 'trung bình';
      }
    }
    setPasswordStrength(strength);
  }, [password]);

  const onSubmit = async (data) => {
    try {
      await registerUser({
        username: data.username,
        password: data.password,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
      });

      showToast({ type: 'success', message: 'Đăng ký thành công' });
      navigate(`/login?username=${encodeURIComponent(data.username)}`);
    } catch (err) {
      showToast({ type: 'error', message: err?.message || 'Đăng ký thất bại' });
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Đăng ký tài khoản</h1>
        <p className="text-gray-600">Tạo tài khoản mới để bắt đầu</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <FormField label="Họ và tên" required error={errors.full_name?.message}>
          <input
            {...register('full_name')}
            type="text"
            placeholder="Nhập họ và tên"
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </FormField>

        {/* Username */}
        <FormField label="Tên đăng nhập" required error={errors.username?.message}>
          <input
            {...register('username')}
            type="text"
            placeholder="Nhập tên đăng nhập (4-50 ký tự)"
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </FormField>

        {/* Email */}
        <FormField label="Email" required error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="Nhập email"
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </FormField>

        {/* Phone */}
        <FormField label="Số điện thoại" error={errors.phone?.message}>
          <input
            {...register('phone')}
            type="tel"
            placeholder="Nhập số điện thoại VN (tùy chọn)"
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </FormField>

        {/* Password */}
        <FormField label="Mật khẩu" required error={errors.password?.message}>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex="-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FormField>

        {/* Password Strength */}
        {password && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {['yếu', 'trung bình', 'mạnh'].map((level) => (
                <div
                  key={level}
                  className={`h-2 flex-1 rounded-full ${
                    (level === 'yếu' && passwordStrength !== 'yếu') ||
                    (level === 'trung bình' && passwordStrength !== 'yếu' && passwordStrength !== 'trung bình') ||
                    (level === 'mạnh' && passwordStrength === 'mạnh')
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Độ mạnh: <span className="font-semibold capitalize">{passwordStrength}</span>
            </p>
          </div>
        )}

        {/* Confirm Password */}
        <FormField label="Nhập lại mật khẩu" required error={errors.password_confirm?.message}>
          <div className="relative">
            <input
              {...register('password_confirm')}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex="-1"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FormField>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="w-full"
        >
          Đăng ký
        </Button>
      </form>

      {/* Link to login */}
      <div className="mt-6 text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">Đã có tài khoản? </span>
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
