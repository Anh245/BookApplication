# JWT và phân quyền cho order/inventory

Hai service xác thực Bearer JWT trực tiếp, kể cả khi được gọi không qua gateway.
API không có token hoặc có token sai chữ ký/hết hạn trả 401; token hợp lệ nhưng
thiếu quyền trả 403. Truy cập đơn của khách khác trả 404 để không lộ sự tồn tại.

## Access token người dùng

Order và inventory xác minh access token RS256 bằng JWKS của UserServices.
Cấu hình `JWT_ISSUER`, `JWT_JWK_SET_URI`, `JWT_AUDIENCE` giống catalog/AI.
Không phân phối khóa RSA riêng cho các resource service và không dùng `JWT_SECRET`
cho access token. Xem [hợp đồng chung và tạo khóa](jwt-contract.md).

Các claim bắt buộc:

- `sub`: ID người dùng ổn định dạng chuỗi số, trùng `userId`.
- `userId`: số nguyên dương trong phạm vi Java Long.
- `roles`: mảng vai trò `CUSTOMER`, `STAFF`, `ADMIN` (không có tiền tố `ROLE_`).
- `iss`/`aud`: khớp issuer/audience đã cấu hình.
- `type`: `access`; refresh token không được gọi API.
- `exp`: thời điểm hết hạn; kiểm tra thời gian bằng Spring Security.

Cart, tạo đơn, danh sách đơn cá nhân, hủy đơn và tạo thanh toán lấy `userId`
từ principal JWT. Frontend bỏ tham số `userId` khỏi các request này. Tham số
`userId` cũ không được dùng để chọn tài khoản.

| API | Quyền |
|---|---|
| `/api/cart/**`, POST `/api/orders`, GET `/api/orders/my` | CUSTOMER/STAFF/ADMIN, dữ liệu của chính mình |
| GET `/api/orders/{id}`, GET `/api/orders/{id}/payments` | Chủ đơn hoặc STAFF/ADMIN |
| POST `/api/orders/{id}/cancel`, POST `/api/orders/{id}/payments` | Chủ đơn |
| GET `/api/orders`, PATCH `/api/orders/{id}/status` | STAFF/ADMIN |
| POST `/api/payments/mock/callback` | ADMIN, chỉ profile dev và không có prod/production |
| GET `/api/payments/vnpay/ipn` | Xác minh chữ ký VNPay khi được bật; không dùng JWT người dùng |
| GET `/api/inventory/{bookId}` | CUSTOMER/STAFF/ADMIN |
| GET `/api/inventory`, `/low-stock`, `/transactions`; POST `/import`, `/adjust` | STAFF/ADMIN |
| Swagger/OpenAPI của hai service | STAFF/ADMIN |

## JWT nội bộ order → inventory

Đặt `INVENTORY_SERVICE_JWT_SECRET` cùng giá trị trên order và inventory. Đây là
khóa HMAC Base64 riêng, ít nhất 32 byte; không liên quan đến cặp khóa RSA của
UserServices. Ứng dụng từ chối khóa HMAC yếu. Order cần khóa này khi `INVENTORY_MOCK=false`; inventory luôn
cần khóa để xác thực API nội bộ.

Order tự tạo token cho từng request, không chuyển tiếp access token khách:

- `iss` và `sub`: `order-service`.
- `aud`: `["inventory-service"]`.
- `type`: `service`, `jti` ngẫu nhiên, `iat` hiện tại, `exp` sau 60 giây.
- `scope`: `inventory.read` cho đọc tồn kho; `inventory.write` cho trừ/hoàn kho.

| API nội bộ mới | Scope |
|---|---|
| GET `/internal/inventory/{bookId}` | `inventory.read` |
| POST `/internal/inventory/orders/{orderId}/deduct` | `inventory.write` |
| POST `/internal/inventory/orders/{orderId}/restore` | `inventory.write` |

Access token người dùng, kể cả ADMIN, không dùng được ở API nội bộ. Service token
không dùng được ở API người dùng/quản trị. Đường trừ/hoàn kho cũ
`/api/inventory/orders/**` bị chặn. Không cấu hình gateway công khai route nội bộ.

## Cấu hình và kiểm thử

Cung cấp khóa qua môi trường hoặc secret manager, không ghi khóa thật vào Git.
Inventory nạp thêm file `.env` từ working directory. Khi chạy bằng IntelliJ,
đặt working directory là `$PROJECT_DIR$/inventory-service`; khai báo `DB_URL`,
`DB_USERNAME`, `DB_PASSWORD`, `INVENTORY_SERVICE_JWT_SECRET` bằng dạng `KEY=value`
trong `inventory-service/.env` hoặc Environment variables của cấu hình Run.
Order cũng nạp `.env` từ working directory: đặt `$PROJECT_DIR$/order-service`
khi chạy IntelliJ. File `order-service/.env` cần `INVENTORY_MOCK`,
`INVENTORY_URL` và `INVENTORY_SERVICE_JWT_SECRET`; khóa nội bộ phải trùng inventory.
Khi chạy local, catalog mặc định cổng `8084`, inventory cổng `8086` và order gọi
inventory tại `http://localhost:8086`. Nếu đổi cổng inventory qua `SERVER_PORT`,
cần đặt `INVENTORY_URL` tương ứng cho order.

Gateway cổng `8080` chuyển `/api/orders/**`, `/api/cart/**`, `/api/payments/**`
nguyên đường dẫn tới `lb://order-service`. Alias `/orders/**` thêm tiền tố `/api`,
ví dụ `/orders/12/payments` thành `/api/orders/12/payments`. Method, query, body
và header Authorization được chuyển tiếp; quyền truy cập và chữ ký VNPay vẫn
do order-service xác minh. Không có route gateway cho `/internal/**`.
Cũng có thể gọi order-service trực tiếp qua cổng `8083`.

Khi không bật profile `mock`, order đọc sách tại
`GET ${CATALOG_URL:http://localhost:8084}/api/catalog/books/{id}`. `CATALOG_URL`
là URL gốc, không thêm tiền tố API. Hai module kiểm tra cùng
[hợp đồng catalog → order](../contracts/catalog/README.md).

`OrderRoutesTests` chạy gateway HTTP với backend/discovery loopback để kiểm tra
route gốc và con, mutation, callback VNPay, alias cũ và đường nội bộ bị chặn.

Hai module dùng Maven, JUnit Jupiter, MockMvc và H2 trong profile `test`.
Test dùng khóa fixture riêng, mock client ngoài và HTTP server loopback, không
cần PostgreSQL, Redis, Eureka hay token/khóa thật. Không thay đổi ngưỡng coverage.

Wrapper inventory hiện tham chiếu Maven 3.10.0. Có thể dùng wrapper 3.9.16 sẵn có
của catalog để chạy đúng POM của từng module (PowerShell từ thư mục gốc):

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21.0.12.1'
& .\catalog-service\mvnw.cmd -f .\order-service\pom.xml verify
& .\catalog-service\mvnw.cmd -f .\inventory-service\pom.xml verify
```

Nếu môi trường Windows chặn Mockito self-attach, truyền `-DargLine=-javaagent:...`
với đường dẫn `byte-buddy-agent` trong Maven cache của máy. Test HTTP cần cho phép
kết nối loopback.

## Giới hạn phạm vi

Access token của cả bốn resource service đã thống nhất RS256/JWKS. Hai service chưa tra cứu trạng thái
tài khoản hay blacklist Redis của UserServices trên từng request; thu hồi token
và khóa tài khoản tức thời cần được đồng bộ riêng.

Callback thanh toán đã được tách thành giả lập theo profile và IPN VNPay có xác
minh chữ ký, số tiền và chống xử lý lặp. Xem [cấu hình VNPay](vnpay-ipn.md).

## Chống request kho lặp

Xem [khóa thao tác, cập nhật database và kiểm chứng](inventory-idempotency.md).

Chuyển trạng thái đơn dùng khóa theo đơn và yêu cầu phục hồi bền vững trước khi
gọi kho. Xem [cơ chế retry và migration order](order-transition-recovery.md).

