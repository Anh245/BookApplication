# Email khôi phục mật khẩu

UserServices gửi OTP qua SMTP bằng `spring-boot-starter-mail`/`JavaMailSender`.
`EmailServiceImpl` giả lập chỉ bật khi profile `dev` được chỉ định và không có
`prod` hoặc `production`. Mặc định, `test`, production và cả tổ hợp `dev,prod`
đều chọn `SmtpEmailService` thật. Không tự chuyển sang giả lập khi SMTP lỗi.

Ngoài `dev`, cần có host SMTP và địa chỉ gửi hợp lệ; thiếu cấu hình sẽ làm bean
gửi mail không khởi tạo được. OTP, nội dung thư và lỗi transport thô không được
ghi log. Bean giả lập cũng không ghi OTP hoặc địa chỉ người nhận vào log.

## Cấu hình gửi thật

Thiết lập biến môi trường hoặc file `.env` riêng của UserServices:

```properties
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=no-reply@example.com
SMTP_AUTH=true
SMTP_STARTTLS=true
SMTP_SSL=false
```

Thay bằng thông tin của nhà cung cấp và địa chỉ gửi đã xác minh. Không đưa mật
khẩu thật vào Git. Nếu dùng SSL trực tiếp ở port 465, đặt `SMTP_SSL=true` và
`SMTP_STARTTLS=false`. Thời gian connect/read/write đều giới hạn 5 giây; debug
SMTP tắt. Nội dung UTF-8 dùng hạn OTP từ `application.security.otp.expiration-minutes`.

Để kiểm thử bằng SMTP cục bộ, dùng profile khác `dev`, host loopback, port của
máy chủ nhận thư test; có thể đặt `SMTP_AUTH=false`, `SMTP_STARTTLS=false` cho
máy chủ cục bộ không yêu cầu xác thực/TLS. Profile `dev` chỉ mô phỏng, không gửi
thư và không có OTP trong log; muốn xem thư khi phát triển thì dùng SMTP cục bộ.

## Gmail / Google Workspace

Dùng `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_AUTH=true`,
`SMTP_STARTTLS=true`, `SMTP_SSL=false`. Điền địa chỉ email đầy đủ vào
`SMTP_USERNAME`; có thể đặt `SMTP_FROM=${SMTP_USERNAME}` để gửi bằng cùng địa chỉ.
Điền mật khẩu ứng dụng vào `SMTP_PASSWORD`, không dùng mật khẩu đăng nhập Google.

Bật xác minh hai bước, rồi tạo mật khẩu ứng dụng cho BookStore tại
[Google App passwords](https://myaccount.google.com/apppasswords).
[Google hướng dẫn điều kiện sử dụng mật khẩu ứng dụng](https://support.google.com/mail/answer/185833?hl=vi).
Nếu tài khoản Workspace không có tùy chọn này, kiểm tra chính sách với quản trị
viên; không bật quyền truy cập ứng dụng kém an toàn. Thông số SMTP tham khảo
[hướng dẫn Gmail của Google](https://support.google.com/a/answer/9003945?hl=vi).

Chỉ nhập thông tin xác thực vào `.env` riêng hoặc secret manager. Cần điền
username/mật khẩu ứng dụng trước khi thử gửi thật; test loopback không xác nhận
tài khoản Google đã được cấu hình đúng.

## Kết quả API

`POST /api/auth/forgot-password` trả thành công sau khi SMTP chấp nhận gửi thư.
Nếu transport từ chối hoặc mất kết nối, API trả `503` trong `ApiResponse` thay
vì báo đã gửi. Lỗi trả về không chứa OTP, nội dung email hoặc thông tin xác thực
SMTP. Không có thay đổi về endpoint hay payload yêu cầu.

SMTP chấp nhận không xác nhận thư đã vào inbox; nhà cung cấp vẫn có thể bounce
hoặc đưa thư vào spam. Cần cấu hình domain/người gửi theo nhà cung cấp để gửi
đến hộp thư thực. Bản sửa chưa thêm hàng đợi gửi thư hay webhook delivery.

## Kiểm chứng

Test kiểm tra profile mặc định/dev/production và tổ hợp profile, bắt log để
phát hiện lộ OTP, lỗi gửi mail trả `503`, chặn chèn header và gửi thư UTF-8 qua
SMTP loopback. Không gửi thư tới người dùng hoặc nhà cung cấp thật trong test.
Test Redis fallback cố tình đưa OTP vào exception để bảo đảm log không lộ mã.

Tham khảo cấu hình SMTP và timeout trong [tài liệu Spring Boot](https://docs.spring.io/spring-boot/reference/io/email.html).
