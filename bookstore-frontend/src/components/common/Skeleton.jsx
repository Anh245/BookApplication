import React from 'react';

/**
 * Skeleton: hiệu ứng shimmer cho loading states
 */
const shimmerClass = 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]';

export const TextSkeleton = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array(lines)
      .fill(0)
      .map((_, i) => (
        <div key={i} className={`h-4 rounded ${shimmerClass}`} />
      ))}
  </div>
);

export const RectangleSkeleton = ({ width = 'w-full', height = 'h-40', className = '' }) => (
  <div className={`${width} ${height} rounded-lg ${shimmerClass} ${className}`} />
);

export const CircleSkeleton = ({ size = 'w-10 h-10', className = '' }) => (
  <div className={`${size} rounded-full ${shimmerClass} ${className}`} />
);

export const BookCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <RectangleSkeleton width="w-full" height="h-48" className="rounded-b-none" />
    <div className="p-3 space-y-2">
      <TextSkeleton lines={2} />
      <TextSkeleton lines={1} />
      <div className="flex justify-between pt-2">
        <TextSkeleton className="w-1/3" />
        <TextSkeleton className="w-1/3" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton = ({ rows = 5, cols = 5 }) => (
  <tbody>
    {Array(rows)
      .fill(0)
      .map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b">
          {Array(cols)
            .fill(0)
            .map((_, colIdx) => (
              <td key={colIdx} className="px-4 py-3">
                <TextSkeleton />
              </td>
            ))}
        </tr>
      ))}
  </tbody>
);

export const DetailSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="md:col-span-1">
      <RectangleSkeleton width="w-full" height="h-72" />
    </div>
    <div className="md:col-span-2 space-y-4">
      <TextSkeleton lines={2} />
      <TextSkeleton lines={1} />
      <div className="space-y-2 pt-4">
        <TextSkeleton lines={4} />
      </div>
    </div>
  </div>
);

// CSS cho shimmer animation
const shimmerCSS = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .animate-shimmer {
    animation: shimmer 1.5s infinite;
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerCSS;
  document.head.appendChild(style);
}
