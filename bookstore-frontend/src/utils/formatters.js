/**
 * Các hàm định dạng dữ liệu
 */

/**
 * Định dạng tiền tệ VNĐ
 * @param {number} amount
 * @returns {string}
 */
export const formatVND = (amount) => {
  if (!amount && amount !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Định dạng ngày giờ
 * @param {string|Date} date
 * @param {string} format - 'short' | 'long' | 'time'
 * @returns {string}
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  const dateObj = new Date(date);

  const formats = {
    short: (d) =>
      d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    long: (d) =>
      d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    time: (d) =>
      d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
  };

  return (formats[format] || formats.short)(dateObj);
};

/**
 * Cắt ngắn chuỗi
 * @param {string} str
 * @param {number} length
 * @returns {string}
 */
export const truncate = (str, length = 50) => {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
};

/**
 * Chuyển đổi số điện thoại VN
 * @param {string} phone
 * @returns {string}
 */
export const formatPhoneVN = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `0${cleaned.slice(-9)}`;
  }
  return phone;
};

/**
 * Xác thực số điện thoại VN
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhoneVN = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && /^0[0-9]{9}$/.test(cleaned);
};