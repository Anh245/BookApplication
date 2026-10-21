# Callback thanh toán VNPay

Hợp đồng IPN PAY 2.1.0 tham khảo từ [tài liệu chính thức VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

## Endpoint thật

`GET /api/payments/vnpay/ipn` nhận query parameters của VNPay, không yêu cầu JWT
người dùng. IPN xác thực bằng chữ ký HMAC-SHA512 trên các trường VNPay sắp xếp theo
tên, URL-encode từng tên/giá trị và bỏ `vnp_SecureHash`, `vnp_SecureHashType`.
So sánh chữ ký theo thời gian hằng; từ chối tham số lặp, chữ ký thiếu/sai và
merchant không khớp. `vnp_HashSecret` là chuỗi do VNPay cấp, không giải mã Base64.

Các biến môi trường:

| Biến | Ý nghĩa |
|---|---|
| `VNPAY_ENABLED` | Mặc định `false`; đặt `true` để bật IPN |
| `VNPAY_TMN_CODE` | Merchant TmnCode do VNPay cấp |
| `VNPAY_HASH_SECRET` | Khóa kiểm tra chữ ký do VNPay cấp; không đưa vào Git/log |

Khi bật VNPay mà thiếu thông tin merchant/khóa, ứng dụng không khởi động.
Đăng ký IPN URL HTTPS công khai với VNPay, định tuyến đúng endpoint này qua reverse
proxy. Cấu hình gateway cũ chưa có route `/api/payments/**`; không dùng URL return
của trình duyệt để cập nhật trạng thái thanh toán.

Callback chỉ xử lý bản ghi có `method=VNPAY`. Dùng `transactionRef` của bản ghi
payment làm `vnp_TxnRef` khi khởi tạo thanh toán. Hai giá trị `vnp_ResponseCode`
và `vnp_TransactionStatus` đều phải bằng `00` để ghi nhận PAID. Số tiền callback
phải bằng `payment.amount * 100` và `order.totalAmount * 100`, so sánh số nguyên
chính xác, không chia nguyên hay làm tròn. Đơn hủy/trả, giao dịch đã kết thúc và
giao dịch thuộc phương thức khác không được đổi sang PAID.

IPN khóa order trước payment trong cùng transaction. Tạo thanh toán và thay đổi
trạng thái đơn cũng dùng khóa order để không ghi đè kết quả IPN đồng thời.
`vnp_TransactionNo` thành công được lưu bền vững với ràng buộc duy nhất. Gửi lại
cùng IPN, kể cả đồng thời hoặc sau khi khởi động lại, không thanh toán lần hai.
Chỉ trả mã thành công sau khi transaction đã commit; lỗi commit trả `99` để retry.

Phản hồi HTTP 200 với JSON `RspCode` và `Message`:

| RspCode | Kết quả |
|---|---|
| `00` | Đã cập nhật kết quả, gồm cả kết quả thanh toán thất bại |
| `01` | Không tìm thấy giao dịch VNPay tương ứng |
| `02` | Đã xác nhận/đóng, đơn không còn được thanh toán hoặc mã giao dịch đã dùng |
| `04` | Số tiền không khớp |
| `97` | Chữ ký/merchant không hợp lệ |
| `99` | Dữ liệu sai, trạng thái chưa kết thúc hoặc lỗi cập nhật; cho phép VNPay retry |

Không áp dụng cửa sổ timestamp ngắn vì IPN có thể được VNPay gửi lại; chống phát
lại dựa trên trạng thái và ràng buộc database. Tiền về muộn cho đơn đã hủy/trả cần
đối soát/hoàn tiền riêng, không tự mở lại đơn.
Nếu đơn đã thu tiền VNPay rồi mới bị hủy/trả, payment vẫn giữ `PAID` chờ hoàn tiền
thật; hệ thống không tự ghi `REFUNDED` khi chưa có xác nhận hoàn tiền từ VNPay.

## Callback giả lập

Đường cũ `POST /api/payments/callback` luôn bị chặn.
Đường mới `POST /api/payments/mock/callback` chỉ được đăng ký khi có profile `dev`
và không có `prod` hoặc `production`; chỉ ADMIN có access token hợp lệ được gọi.
Profile `mock` hiện có của catalog client không tự bật callback giả lập.

## Database và kiểm chứng

Với database PostgreSQL đã tồn tại, xem và áp dụng
[script cập nhật schema](../order-service/src/main/resources/db/manual/vnpay.sql)
trước khi bật VNPay. Script thêm cột/mục duy nhất cho mã VNPay và cập nhật enum
check constraints mặc định để nhận `VNPAY`; schema có tên constraint tùy biến
cần đối chiếu trước. Script không chạy tự động. Không dựa vào `ddl-auto=update`
để nâng cấp constraint enum của database thật.

Test dùng H2, khóa merchant giả lập và request MockMvc; có các trường hợp sửa
số tiền sau khi ký, sai merchant, sai số tiền, gửi lại/đồng thời, tái dùng mã VNPay
cho đơn khác, đơn hủy, phương thức sai và tách profile dev/prod.

Phạm vi này bảo vệ callback IPN. Chưa tạo URL checkout/Return URL hay gọi API truy
vấn/hoàn tiền VNPay. Cần kiểm chứng với merchant sandbox thật sau khi có thông tin
kết nối; không có yêu cầu nào trong test gọi VNPay hoặc tạo giao dịch tiền thật.
