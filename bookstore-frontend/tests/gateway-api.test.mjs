import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import { createServer as createHttpServer } from 'node:http';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
};
const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null } });
after(() => server.close());
const load = path => server.ssrLoadModule(`/src/api/${path}`);
const { default: client } = await load('axiosClient.js');
const calls = [];
let responseBody;
client.defaults.adapter = async config => {
  calls.push({ url: client.getUri(config), method: config.method, body: config.data && JSON.parse(config.data) });
  return { data: typeof responseBody === 'function' ? responseBody(config) : responseBody, status: 200, statusText: 'OK', headers: {}, config };
};

test('all clients use the same gateway', async () => {
  assert.equal(client.defaults.baseURL, '/api');
  const { API_CONFIG } = await load('apiConfig.ts');
  for (const config of Object.values(API_CONFIG)) {
    assert.ok(config.BASE_URL === '/api' || config.BASE_URL.startsWith('/api/'));
  }
  assert.equal(server.config.server.proxy['/api'].target, 'http://localhost:8080');
});

test('stale browser mock settings cannot bypass the real gateway configuration', async () => {
  localStorage.setItem('VITE_USE_MOCK', 'true');
  const { isMockEnabled } = await load('request.js');
  assert.equal(isMockEnabled(), false);
  localStorage.removeItem('VITE_USE_MOCK');
});

test('profile routes and password DTO match UserServices', async () => {
  const api = await load('services/authApi.js');
  responseBody = { success: true, data: { userId: 7, fullName: 'Reader' } };
  const user = await api.getMe();
  assert.equal(user.full_name, 'Reader');
  assert.equal(calls.at(-1).url, '/api/users/me');
  await api.changePassword({ current_password: 'old', new_password: 'new' });
  assert.equal(calls.at(-1).method, 'put');
  assert.equal(calls.at(-1).url, '/api/users/change-password');
  assert.deepEqual(calls.at(-1).body, { oldPassword: 'old', newPassword: 'new' });
});

test('unimplemented features never send invented requests', async () => {
  const payments = await load('services/paymentApi.js');
  const stats = await load('services/statsApi.js');
  const count = calls.length;
  await assert.rejects(payments.verifyPayment(1), /chưa được backend hỗ trợ/);
  await assert.rejects(stats.getStats(), /chưa được backend hỗ trợ/);
  assert.equal(calls.length, count);
});

test('TypeScript clients import in the browser and use public catalog filters', async () => {
  const { catalogService, inventoryService, orderService } = await load('index.ts');
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return { ok: true, json: async () => ({ content: [], items: [], orderId: 9 }) };
  };
  try {
    await catalogService.getBooksByAuthor(3);
    assert.equal(requests.at(-1).url, '/api/catalog/books?authorId=3&page=0&size=20');
    await inventoryService.getAllInventory();
    assert.equal(requests.at(-1).url, '/api/inventory');
    localStorage.setItem('userId', '7');
    const order = await orderService.placeOrder({ shippingAddress: 'Address', paymentMethod: 'COD' });
    assert.equal(order.orderId, 9);
    assert.equal(requests.at(-1).url, '/api/orders');
    await assert.rejects(inventoryService.deductInventory(9, { items: [] }), /chưa có API public/);
    assert.equal(requests.length, 3);
  } finally {
    globalThis.fetch = original;
  }
});

test('Vite proxy forwards API path, query and bearer header to its backend target', async () => {
  const backend = createHttpServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ path: request.url, authorization: request.headers.authorization, origin: request.headers.origin }));
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const proxy = await createServer({
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null,
      proxy: { '/api': { target: `http://127.0.0.1:${backend.address().port}`, changeOrigin: true } } },
  });
  try {
    await proxy.listen();
    const response = await fetch(`http://127.0.0.1:${proxy.httpServer.address().port}/api/catalog/books?q=Java`, { headers: { Authorization: 'Bearer test-access', Origin: 'http://localhost:5173' } });
    assert.deepEqual(await response.json(), { path: '/api/catalog/books?q=Java', authorization: 'Bearer test-access', origin: 'http://localhost:5173' });
  } finally {
    await proxy.close();
    await new Promise(resolve => backend.close(resolve));
  }
});

test('login sends the backend DTO and adapts tokens for the UI', async () => {
  const api = await load('services/authApi.js');
  responseBody = { success: true, data: { accessToken: 'access', refreshToken: 'refresh', userId: 7, username: 'reader', role: 'CUSTOMER' } };
  const result = await api.login('reader', 'password');
  assert.deepEqual(calls.at(-1), { method: 'post', url: '/api/auth/login', body: { usernameOrEmail: 'reader', password: 'password' } });
  assert.equal(result.token, 'access');
  assert.equal(result.user.id, 7);
});

test('catalog paths, pagination and camelCase query match the provider', async () => {
  const api = await load('services/bookApi.js');
  responseBody = { content: [{ id: 42, title: 'Java', category: { id: 3 } }], totalElements: 21, number: 1, size: 10 };
  const result = await api.getBooks({ page: 2, limit: 10, search: 'Java', category_id: 3 });
  const request = new URL(calls.at(-1).url, 'http://localhost:5173');
  assert.equal(request.pathname, '/api/catalog/books');
  assert.equal(request.searchParams.get('page'), '1');
  assert.equal(request.searchParams.get('size'), '10');
  assert.equal(request.searchParams.get('q'), 'Java');
  assert.equal(request.searchParams.get('categoryId'), '3');
  assert.equal(result.data[0].id, 42);
  assert.equal(result.total, 21);
});

test('cart uses bookId and DELETE on the cart root', async () => {
  const api = await load('services/cartApi.js');
  responseBody = { items: [], totalAmount: 0 };
  await api.addToCart(42, 2);
  assert.deepEqual(calls.at(-1).body, { bookId: 42, quantity: 2 });
  await api.clearCart();
  assert.equal(calls.at(-1).method, 'delete');
  assert.equal(calls.at(-1).url, '/api/cart');
});

test('book detail reads stock from inventory through the gateway for signed-in users', async () => {
  const api = await load('services/bookApi.js');
  localStorage.setItem('accessToken', 'test-access');
  responseBody = config => config.url.startsWith('/inventory/') ? { bookId: 42, quantity: 6 } : { id: 42, title: 'Java' };
  try {
    const book = await api.getBookDetail(42);
    assert.equal(book.stock_quantity, 6);
    assert.equal(calls.at(-1).url, '/api/inventory/42');
  } finally {
    localStorage.removeItem('accessToken');
  }
});

test('customer orders use /my and status updates use PATCH', async () => {
  localStorage.setItem('user', JSON.stringify({ role: 'CUSTOMER' }));
  const api = await load('services/orderApi.js');
  responseBody = [];
  await api.getOrders();
  assert.equal(calls.at(-1).url, '/api/orders/my');
  responseBody = { orderId: 1, orderStatus: 'CONFIRMED', items: [] };
  await api.confirmOrder(1);
  assert.equal(calls.at(-1).method, 'patch');
});

test('inventory and user updates use existing backend routes', async () => {
  const inventory = await load('services/inventoryApi.js');
  responseBody = {};
  await inventory.importStock({ book_id: 42, quantity: 3 });
  assert.equal(calls.at(-1).body.bookId, 42);
  await inventory.adjustInventory({ book_id: 42, newQuantity: 8 });
  assert.equal(calls.at(-1).url, '/api/inventory/adjust');
  assert.equal(calls.at(-1).body.newQuantity, 8);
  const users = await load('services/userApi.js');
  await users.updateUserRole(7, 'STAFF');
  assert.equal(calls.at(-1).method, 'patch');
  assert.deepEqual(calls.at(-1).body, { role: 'STAFF' });
});

test('recommendations use POST and payment is scoped to its order', async () => {
  const ai = await load('services/aiApi.js');
  responseBody = { answer: 'Books', books: [] };
  await ai.suggestBooks({ message: 'Java' });
  assert.equal(calls.at(-1).method, 'post');
  assert.equal(calls.at(-1).url, '/api/ai/recommendations');
  const payments = await load('services/paymentApi.js');
  await payments.createPayment({ order_id: 9, payment_method: 'VNPAY' });
  assert.equal(calls.at(-1).url, '/api/orders/9/payments');
  assert.deepEqual(calls.at(-1).body, { method: 'VNPAY' });
});
