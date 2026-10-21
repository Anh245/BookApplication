import React, { useEffect } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

/**
 * Toast: thông báo tạm thời
 */
const Toast = ({ id, type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: Check,
    error: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const Icon = icons[type] || icons.info;

  return (
    <div
      className={`${colors[type]} border rounded-lg p-4 flex items-start gap-3 shadow-lg animate-slide-in-up`}
      role="alert"
      aria-live="polite"
    >
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
        aria-label="Đóng"
      >
        <X size={16} />
      </button>
    </div>
  );
};

/**
 * ToastContainer: container hiển thị tất cả toast
 */
export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

export default Toast;

// Add CSS animation
const toastCSS = `
  @keyframes slideInUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .animate-slide-in-up {
    animation: slideInUp 0.3s ease-out;
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = toastCSS;
  document.head.appendChild(style);
}
