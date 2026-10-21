import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { unsupportedApi } from '../gatewayConfig';

/**
 * Tạo yêu cầu thanh toán
 * @param {object} data - {order_id, payment_method, amount}
 * @returns {Promise<object>}
 */
export const createPayment = (data) => {
  return axiosClient.post(ENDPOINTS.PAYMENTS.CREATE(data.orderId ?? data.order_id), { method: data.method ?? data.paymentMethod ?? data.payment_method });
};

/**
 * Xác nhận thanh toán
 * @param {number|string} id
 * @param {object} data - {transaction_id, status}
 * @returns {Promise<object>}
 */
export const verifyPayment = () => {
  return unsupportedApi('Xác nhận thanh toán từ trình duyệt');
};

/**
 * Lấy lịch sử thanh toán của đơn hàng
 * @param {number|string} orderId
 * @returns {Promise<Array>}
 */
export const getPaymentHistory = (orderId) => {
  return axiosClient.get(ENDPOINTS.PAYMENTS.HISTORY(orderId));
};
