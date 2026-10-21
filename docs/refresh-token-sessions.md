# Phiên đăng nhập, refresh rotation và logout

Mỗi lần đăng ký/đăng nhập tạo một token family riêng trong bảng `auth_sessions`
của UserServices. Access token và refresh token cùng mang claim `sid`, mỗi token
có `jti` ngẫu nhiên riêng. Response API giữ nguyên cấu trúc `AuthResponse`.

Database lưu ID phiên, ID người dùng, SHA-256 của refresh token hiện hành, hạn
phiên và cờ thu hồi. Không lưu refresh token dạng rõ. Phiên có hạn tuyệt đối bằng
refresh token đầu tiên (`JWT_REFRESH_EXPIRATION`, mặc định 7 ngày); xoay token
không kéo dài hạn này. Hết hạn phiên phải đăng nhập lại.

## Rotation nguyên tử

`POST /api/auth/refresh-token` kiểm tra chữ ký RS256, issuer, audience, loại token,
identity và hạn JWT, rồi lấy khóa `PESSIMISTIC_WRITE` trên hàng `sid`. Trong cùng
transaction, service kiểm tra phiên/tài khoản hiện tại, so sánh hash, ký cặp token
mới và thay hash hiện hành. Lỗi ký hoặc commit không tiêu thụ refresh token cũ.

Dùng lại refresh token đã xoay trả `401` và thu hồi **cả family**, bao gồm cặp
token vừa được cấp. Việc thu hồi vẫn commit khi request trả lỗi; riêng exception
replay được cấu hình không rollback. Refresh/logout dùng cùng khóa phiên, hoạt
động giữa các instance và không dựa vào cache Redis hay bộ nhớ từng node.

Hai request refresh đồng thời từ cùng token chỉ có tối đa một request được cấp
cặp token mới; request còn lại được xem là replay và thu hồi family. Client cần
gom các lời gọi refresh đang chạy thành một request, lưu cặp token mới cùng lúc,
và không tự gửi lại refresh token cũ khi mất phản hồi. Trường hợp mất phản hồi
rồi dùng lại token cũ sẽ yêu cầu đăng nhập lại.

## Logout

`POST /api/auth/logout` giữ cách gọi hiện có: `Authorization: Bearer <access token>`.
Với access token hợp lệ còn hạn, service khóa hàng phiên và thu hồi family trong
database trước, sau đó tiếp tục blacklist access token theo TTL cũ. Có thể dùng
access token cũ còn hạn của cùng family để logout sau khi đã rotation. Logout
lặp lại với token đó vẫn thành công. Request không có Bearer không xác định được
phiên nên giữ hành vi cũ: không thu hồi phiên nào.

Sau logout, mọi refresh token của family đều bị từ chối. Filter của **UserServices**
cũng đọc trạng thái phiên trên mỗi request, nên mọi access token trong family bị
từ chối tại đây ngay cả khi Redis blacklist mất kết nối hoặc cache chưa đồng bộ.
Một lần đăng nhập khác có family khác và vẫn hoạt động bình thường.

Catalog/AI/order/inventory hiện xác minh access token qua JWKS và **chưa tra cứu
trạng thái phiên UserServices**. Các access token đã phát có thể tiếp tục dùng ở
những service này đến khi hết hạn; logout không thể cấp thêm token từ family đã
thu hồi. Thu hồi access tức thời ở toàn bộ resource service cần introspection
hoặc đồng bộ sự kiện thu hồi riêng; JWKS chỉ cung cấp khóa xác minh chữ ký.

Khi database phiên không truy cập được, refresh/logout và kiểm tra phiên không
chuyển sang bộ nhớ cục bộ để cấp quyền. Phải khôi phục database để xử lý an toàn.

## Migration và triển khai

1. Dừng toàn bộ UserServices cũ để tránh endpoint refresh cũ vẫn cấp token.
2. Sao lưu database, chạy thủ công
   `UserServices/src/main/resources/db/manual/auth-sessions.sql` vào database
   UserServices. Module chưa có Flyway/Liquibase. Không thay database của các
   service khác.
3. Triển khai bản mới và yêu cầu người dùng đăng nhập lại. Token cũ không có
   `sid` hoặc không có bản ghi phiên sẽ không được nhận tại UserServices và không
   được refresh; không tự tạo family từ token cũ.

Giữ hàng phiên đã thu hồi ít nhất đến `expires_at`; nếu dọn dẹp sau hạn này thì
token thuộc phiên đó vẫn bị từ chối do không có bản ghi. Không khôi phục hoặc
xóa cờ `revoked` để kích hoạt lại family đã bị phát hiện replay.

## Kiểm chứng

`RefreshSessionTests` chạy JPA/transaction thật trên H2, MockMvc với filter thật,
khóa RSA tạm và các dịch vụ Redis/email/rate limit được mock. Test kiểm tra
rotation, replay thu hồi cả family, logout, nhiều phiên độc lập, hạn tuyệt đối,
token sai loại/không có phiên, tài khoản bị khóa và các request đồng thời.

Kiểm thử H2 không thay PostgreSQL thực. Các test tích hợp cũ cần PostgreSQL/Redis
bên ngoài không thuộc bộ test tự chứa này. Trước triển khai, kiểm tra rotation
và logout đồng thời trên PostgreSQL với nhiều instance và migration thực tế.
