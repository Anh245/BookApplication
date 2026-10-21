# Hợp đồng JWT chung: RS256 và JWKS

UserServices phát access/refresh token bằng RS256. Catalog, AI, order và inventory
chỉ nhận access token RS256 hợp lệ từ issuer đã cấu hình; không còn dùng khóa
HMAC chung cho token người dùng. Cách xác minh qua JWKS và issuer dựa trên
[Spring Security Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).

## Claims và quyền

| Trường | Hợp đồng |
|---|---|
| Header `alg` | `RS256` |
| Header `kid` | Trùng mã khóa trong JWKS |
| `iss` | `JWT_ISSUER`, mặc định `http://localhost:8081` |
| `aud` | Chứa `JWT_AUDIENCE`, mặc định `bookstore` |
| `sub` | ID người dùng ổn định dạng chuỗi số dương, ví dụ `"7"` |
| `userId` | Số nguyên dương kiểu Long, phải trùng `sub` |
| `username` | Tên đăng nhập; UserServices dùng để nạp tài khoản hiện tại |
| `roles` | Mảng không rỗng, chỉ có `CUSTOMER`, `STAFF`, `ADMIN` |
| `type` | `access` hoặc `refresh`; resource service từ chối refresh token |
| `iat`, `exp`, `jti` | Thời điểm phát/hết hạn và mã token duy nhất |

Backend ánh xạ `roles` thành `ROLE_...`; claim đơn `role` cũ không còn cấp quyền.
`AuthResponse.role` trong dữ liệu trả về cho frontend vẫn giữ nguyên, vì đó không
phải claim JWT. Access token người dùng không nhận thêm quyền nội bộ từ `scope`.
Refresh token không mang `roles` và không dùng để gọi API nghiệp vụ.

UserServices vẫn nạp trạng thái tài khoản trên mỗi request, chỉ tạo authentication
cho ACTIVE. Các resource service xác minh JWT độc lập, chưa truy vấn blacklist
hoặc trạng thái tài khoản tức thời; đồng bộ thu hồi token là phạm vi riêng.

## Tạo và giữ khóa

Chỉ UserServices giữ khóa RSA riêng dạng **PEM PKCS#8** (`BEGIN PRIVATE KEY`).
Khóa công khai cùng cặp dạng **PEM X.509** (`BEGIN PUBLIC KEY`). Ứng dụng kiểm tra
RSA ít nhất 2048 bit, khóa cùng cặp và `kid` hợp lệ khi khởi động; không tự sinh
khóa mới lúc chạy và không có khóa bí mật mặc định.

Ví dụ PowerShell, từ thư mục gốc dự án, với OpenSSL đã được cài:

```powershell
$taskKeyDirectory = Join-Path (Get-Location) '.local/jwt-keys'
if (Test-Path -LiteralPath $taskKeyDirectory) {
    throw 'Thư mục đã tồn tại; chọn thư mục mới để không ghi đè khóa.'
}
New-Item -ItemType Directory -Path $taskKeyDirectory | Out-Null
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$taskKeyDirectory/private.pem"
if ($LASTEXITCODE -ne 0) { throw 'Không tạo được khóa RSA riêng.' }
openssl pkey -in "$taskKeyDirectory/private.pem" -pubout -out "$taskKeyDirectory/public.pem"
if ($LASTEXITCODE -ne 0) { throw 'Không xuất được khóa RSA công khai.' }
$env:JWT_PRIVATE_KEY_PATH = Join-Path $taskKeyDirectory 'private.pem'
$env:JWT_PUBLIC_KEY_PATH = Join-Path $taskKeyDirectory 'public.pem'
$env:JWT_KEY_ID = 'bookstore-1'
$env:JWT_ISSUER = 'http://localhost:8081'
$env:JWT_AUDIENCE = 'bookstore'
```

`.local/jwt-keys/` được ignore bởi Git. Dùng quyền truy cập file của hệ điều hành
để giới hạn khóa riêng cho tài khoản chạy UserServices. Khi triển khai container,
mount file khóa read-only và dùng đường dẫn bên trong container; không bake khóa
vào image hoặc phân phối sang các resource service. Không thay đổi/ghi đè khóa
đang dùng khi khởi động lại ứng dụng.

## Cấu hình từng service

UserServices cần `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`; có thể cấu hình
`JWT_KEY_ID`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION`,
`JWT_REFRESH_EXPIRATION`. Cập nhật `.env` hiện có theo `.env.example` mới.
Biến `JWT_SECRET` cũ không còn được dùng cho người dùng.

`GET http://localhost:8081/.well-known/jwks.json` được truy cập công khai và chỉ
trả `keys` với `kty`, `use`, `alg`, `kid`, `n`, `e`; không có phần khóa riêng.
Tài liệu và endpoint này không cấp token. Đăng ký/đăng nhập vẫn dùng API
`/api/auth/**` của UserServices.

Trên cả catalog, AI, order và inventory:

```powershell
$env:JWT_ISSUER = 'http://localhost:8081'
$env:JWT_JWK_SET_URI = 'http://localhost:8081/.well-known/jwks.json'
$env:JWT_AUDIENCE = 'bookstore'
```

Issuer phải giống chính xác (kể cả dấu `/` cuối nếu dùng). JWKS URI phải truy cập
được từ tiến trình/container resource service. Trong container, `localhost`
trỏ vào chính container; dùng DNS của UserServices cho JWKS URI, đồng thời giữ
giá trị issuer nhất quán với token phát ra. Gateway hiện không công bố route auth
và JWKS mới; cấu hình URL trực tiếp hoặc reverse proxy phù hợp khi triển khai.

## Token nội bộ

Order → inventory tiếp tục dùng khóa HMAC riêng `INVENTORY_SERVICE_JWT_SECRET`,
issuer `order-service`, audience `inventory-service`, `type=service`, scope
`inventory.read`/`inventory.write`. Khóa này chỉ thuộc hai service đó. Decoder
người dùng RS256 không nhận token này và decoder nội bộ không nhận access token
RSA của người dùng.

API `/internal/ai/purchases` chỉ nhận token từ issuer/JWKS đã cấu hình với
`type=service`, audience đúng và scope `ai.history.write`. Token nội bộ chỉ được
cấp bởi hạ tầng đáng tin cậy; API đăng nhập người dùng không phát loại token này.
Service token không được dùng cho `/api/ai/**` và không lấy quyền quản trị từ `roles`.

## Chuyển đổi và kiểm chứng

Token đăng nhập mới có thêm `sid` liên kết với family trong UserServices. Refresh
xoay nguyên tử và logout thu hồi family; xem [hợp đồng phiên và migration](refresh-token-sessions.md).
Resource service hiện chưa tra cứu trạng thái family để thu hồi access tức thời.

Triển khai đồng bộ bộ phát và các bộ kiểm tra token; người dùng cần đăng nhập lại
vì token HMAC/claim `role` cũ bị từ chối. Cấu hình hiện công bố một khóa RSA đang
hoạt động; đổi cặp khóa/kid cũng yêu cầu đăng nhập lại, chưa hỗ trợ giữ nhiều khóa
cũ để luân chuyển không gián đoạn.

`sub` của lịch sử AI chuyển sang ID người dùng, và `userSubject` trong sự kiện mua
hàng phải dùng cùng ID dạng chuỗi. Dữ liệu lịch sử cũ dưới username không được tự
sửa/xóa; nếu cần giữ lịch sử đó, thực hiện ánh xạ username → ID trong migration riêng.

Test UserServices dùng cặp khóa RSA tạm, kiểm tra JWKS không lộ khóa riêng và
token thực do JwtService phát được Nimbus giải mã qua HTTP JWKS. Test các resource
service dùng JWKS loopback, chữ ký thật, kiểm tra vai trò và từ chối sai issuer,
audience, loại token, subject, claim cũ và thuật toán HMAC. Không cần khóa thật
hoặc PostgreSQL/Redis bên ngoài cho những test bảo mật này.
