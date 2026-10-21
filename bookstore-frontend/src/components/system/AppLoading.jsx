import React, { useEffect, useState } from 'react';

/**
 * AppLoading: màn hình chờ khởi tạo ứng dụng
 * Chỉ hiện sau 200ms để tránh nháy khi tải nhanh
 */
const AppLoading = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        {/* Logo placeholder */}
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-6 mx-auto">
          <span className="text-2xl font-bold text-white">📚</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-8">Đang tải...</h1>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
};

export default AppLoading;
