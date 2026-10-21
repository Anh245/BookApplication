# Chống trừ/hoàn kho lặp

`inventory_operations` giữ một khóa duy nhất `(order_id, type)` cho mỗi thao tác
`ORDER_DEDUCT` hoặc `ORDER_RESTORE`. Không xóa các khóa này khi đơn hoàn thành;
request gửi lại vẫn cần được nhận diện.

Trong cùng transaction với stock và lịch sử kho, service chạy `INSERT ... ON
CONFLICT DO NOTHING`, rồi `SELECT ... FOR UPDATE` trên khóa thao tác. Request
trùng chờ transaction trước kết thúc, đọc `completed` và bỏ qua nếu đã thành công.
Việc tạo khóa, cập nhật stock, ghi lịch sử và đánh dấu hoàn tất đều rollback
nếu có lỗi. Các câu SQL dùng tham số, cùng DataSource/JpaTransactionManager.

Cả trừ và hoàn đều lấy khóa `ORDER_DEDUCT` trước; hoàn kho lấy tiếp khóa
`ORDER_RESTORE`. Stock vẫn được khóa theo thứ tự `book_id`. Hoàn trước khi có
lịch sử trừ không đánh dấu thao tác hoàn thành; có thể gọi hoàn lại sau khi trừ.
Đơn đã hoàn cũng không được trừ lại bởi request xác nhận gửi lại.

## Cập nhật database hiện có

1. Dừng toàn bộ instance inventory và các tác vụ ghi kho. Không chạy đồng thời
   phiên bản cũ và mới: phiên bản cũ chưa tuân thủ khóa thao tác.
2. Sao lưu database; chạy file
   `inventory-service/src/main/resources/db/manual/inventory-operations.sql`
   vào `inventory_db` bằng công cụ quản trị PostgreSQL hiện có.
3. Chạy phiên bản mới với `JPA_DDL_AUTO=validate` sau khi các bảng khác đã có.
   Script này được chạy thủ công; module chưa có Flyway/Liquibase.

Script tạo bảng/ràng buộc và backfill khóa đã hoàn thành từ lịch sử cũ. Service
cũng kiểm tra lịch sử cũ **sau khi lấy khóa** để bảo vệ các đơn chưa backfill.
Lịch sử đã bị ghi lặp trước bản sửa cần đối soát riêng; script không tự sửa số
lượng tồn hay xóa lịch sử. Một đơn có nhiều sách được phép có nhiều dòng lịch sử.

## Kiểm chứng

`InventoryIdempotencyTests` chạy request đồng thời trên database H2 ở chế độ
PostgreSQL, kiểm tra trừ/hoàn đúng một lần, unique constraint, rollback/retry,
hoàn đến sớm và lịch sử cũ. Test cưỡng bức hai request cùng vượt qua điều kiện
`exists` của code cũ để tái hiện race một cách xác định.

H2 không thay thế kiểm thử khóa trên PostgreSQL thực. Trước rollout, chạy lại
hai request trùng đơn trên PostgreSQL và xác nhận chỉ có một khóa thao tác,
lịch sử chỉ có một dòng cho mỗi sách/loại và số lượng kho chỉ thay đổi một lần.
