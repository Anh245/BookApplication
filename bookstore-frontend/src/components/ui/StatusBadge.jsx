import React from 'react';
import Badge from './Badge';

/**
 * StatusBadge Component
 * Displays status with appropriate color
 */
const StatusBadge = ({
  type = 'order', // 'order' | 'payment' | 'user'
  value,
  className = '',
}) => {
  // Order status
  const orderStatuses = {
    PENDING: { label: 'Chờ xác nhận', variant: 'warning' },
    CONFIRMED: { label: 'Đã xác nhận', variant: 'info' },
    PREPARING: { label: 'Đang chuẩn bị', variant: 'info' },
    SHIPPING: { label: 'Đang giao', variant: 'info' },
    DELIVERED: { label: 'Đã giao', variant: 'success' },
    CANCELLED: { label: 'Đã hủy', variant: 'danger' },
  };

  // Payment status
  const paymentStatuses = {
    PENDING: { label: 'Chờ thanh toán', variant: 'warning' },
    PAID: { label: 'Đã thanh toán', variant: 'success' },
    FAILED: { label: 'Thanh toán thất bại', variant: 'danger' },
    REFUNDED: { label: 'Đã hoàn tiền', variant: 'info' },
  };

  // User status
  const userStatuses = {
    ACTIVE: { label: 'Hoạt động', variant: 'success' },
    LOCKED: { label: 'Đã khóa', variant: 'danger' },
    INACTIVE: { label: 'Không hoạt động', variant: 'warning' },
  };

  let statusMap = {};
  if (type === 'order') statusMap = orderStatuses;
  if (type === 'payment') statusMap = paymentStatuses;
  if (type === 'user') statusMap = userStatuses;

  const status = statusMap[value] || { label: value, variant: 'primary' };

  return (
    <Badge variant={status.variant} size="sm" className={className}>
      {status.label}
    </Badge>
  );
};

export default StatusBadge;
