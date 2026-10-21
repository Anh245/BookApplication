import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState Component
 * Shown when no data is available
 */
const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Không có dữ liệu',
  description = '',
  action,
  actionLabel = 'Tìm hiểu thêm',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`.trim()}>
      {Icon && (
        <Icon className="w-12 h-12 text-ink-muted dark:text-ink-muted mb-4 opacity-50" />
      )}
      <h3 className="text-heading-md font-semibold text-ink dark:text-ink mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-body-sm text-ink-muted dark:text-ink-muted mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
