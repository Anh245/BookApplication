import React from 'react';
import { ShoppingCart } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState: trạng thái không có dữ liệu
 */
const EmptyState = ({ icon: Icon = ShoppingCart, title, description, action, actionLabel = 'Thực hiện' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Icon size={48} className="text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-600 text-center mb-4 max-w-sm">{description}</p>}
      {action && (
        <Button variant="primary" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
