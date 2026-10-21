# Kết nối frontend qua API Gateway

Trong `.env`, dùng cấu hình duy nhất cho cả Axios và các client TypeScript:

```env
VITE_API_URL=/api
VITE_USE_MOCK=false
```

Khởi động lại `npm run dev` sau khi sửa `.env`. Vite chuyển tiếp `/api/**` tới
`http://localhost:8080`, giữ nguyên đường dẫn, query và Authorization header.
Trình duyệt gọi cùng origin với frontend. Proxy vẫn giữ header `Origin` của các
request như POST; UserServices phải cho phép `http://localhost:5173` và
`http://127.0.0.1:5173` qua `CORS_ALLOWED_ORIGINS`. `changeOrigin` chỉ đổi Host,
không thay thế danh sách CORS của backend. Gateway và Eureka phải chạy cùng các service được gọi.

| Nhóm API | Đường dẫn qua Gateway |
|---|---|
| Xác thực | `/api/auth/**` |
| Hồ sơ | `/api/users/**` |
| Quản trị người dùng | `/api/admin/users/**` |
| Sách, thể loại, tác giả, nhà xuất bản | `/api/catalog/**` |
| Giỏ hàng | `/api/cart/**` |
| Đơn hàng cá nhân | `/api/orders/my` |
| Đơn hàng quản trị | `/api/orders` |
| Thanh toán của đơn | `/api/orders/{orderId}/payments` |
| Tồn kho | `/api/inventory/**` |
| AI | `/api/ai/chat`, `/api/ai/search`, `/api/ai/recommendations` |

Không cấu hình URL riêng của từng service. Các biến `VITE_*_URL` cũ ngoài
`VITE_API_URL` không được client sử dụng. LocalStorage không thể bật mock khi
`VITE_USE_MOCK=false`; bản build production luôn dùng API thật.

Backend hiện chưa cung cấp API thống kê, sách nổi bật/bán chạy, lịch sử trạng thái
đơn, tạo/sửa/xóa hồ sơ người khác bằng admin hoặc xác minh thanh toán từ frontend.
Các hàm tương ứng báo chưa hỗ trợ, không gọi endpoint tự đặt. Việc trừ/hoàn kho
theo đơn và xác minh IPN VNPay thuộc backend, không công bố qua frontend.

Khi triển khai bản build, web server cần reverse proxy `/api/**` tới Gateway.
Nếu triển khai khác origin, đặt `VITE_API_URL=https://<gateway>/api` lúc build
và cấu hình CORS tại hệ thống triển khai.

Kiểm chứng: `npm test`, `npm run build`, `npm run lint`.
