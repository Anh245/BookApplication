import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';
import { mapOrder } from '../adapters';
import { unsupportedApi } from '../gatewayConfig';

export const getOrders = (params = {}) => {
  return makeRequest('getOrders', [params], async () => {
    const role = JSON.parse(localStorage.getItem('user') || '{}').role;
    const admin = role === 'ADMIN' || role === 'STAFF';
    const status = params.status?.toUpperCase();
    const orders = await axiosClient.get(admin ? ENDPOINTS.ORDERS.LIST : ENDPOINTS.ORDERS.MY, { params: admin && status ? { status } : {} });
    const data = orders.map(mapOrder).filter(order => !status || order.status === status);
    return { data: params.limit ? data.slice(0, params.limit) : data, total: data.length };
  });
};

export const getOrderDetail = (id) => {
  return makeRequest('getOrderDetail', [id], () =>
    axiosClient.get(ENDPOINTS.ORDERS.DETAIL(id)).then(mapOrder)
  );
};

export const createOrder = (data) => {
  return makeRequest('createOrder', [data], () =>
    axiosClient.post(ENDPOINTS.ORDERS.CREATE, { shippingAddress: data.shippingAddress ?? data.shipping_address, paymentMethod: data.paymentMethod ?? data.payment_method }).then(mapOrder)
  );
};

export const cancelOrder = (id, data = {}) => {
  return makeRequest('cancelOrder', [id, data?.reason], () =>
    axiosClient.post(ENDPOINTS.ORDERS.CANCEL(id)).then(mapOrder)
  );
};

export const updateOrderStatus = (id, data) => {
  return makeRequest('updateOrderStatus', [id, data?.status || data, data?.note || data?.notes], () =>
    axiosClient.patch(ENDPOINTS.ORDERS.STATUS(id), { status: (data?.status ?? data).toUpperCase(), note: data?.note ?? data?.notes }).then(mapOrder)
  );
};

export const confirmOrder = (id) => {
  return makeRequest('updateOrderStatus', [id, 'CONFIRMED', 'Xác nhận đơn hàng'], () =>
    axiosClient.patch(ENDPOINTS.ORDERS.STATUS(id), { status: 'CONFIRMED' }).then(mapOrder)
  );
};

export const getOrderStatusHistory = (id) => {
  return makeRequest('getOrderDetail', [id], () => unsupportedApi('Lịch sử chuyển trạng thái đơn hàng'));
};
