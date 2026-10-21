# Chuyển trạng thái đơn và phục hồi tồn kho

`OrderRepository.findByIdForUpdate()` dùng `PESSIMISTIC_WRITE` để tuần tự hóa
chuyển trạng thái theo đơn. `Order.version` chặn ghi đè từ một bản sao đã cũ,
kể cả các luồng khác thay đổi thanh toán. Việc kiểm tra chủ sở hữu, trạng thái
nguồn và thao tác đang chờ đều diễn ra sau khi khóa đơn.

## Yêu cầu bền vững trước khi gọi kho

`OrderTransitionCoordinator` thực hiện hai transaction riêng:

1. Khóa đơn, kiểm tra quyền/chuyển trạng thái, lưu `order_transitions` ở trạng
   thái `PENDING` rồi commit. Chưa gọi kho và chưa đổi trạng thái đơn.
2. Khóa lại đơn rồi khóa yêu cầu chuyển trạng thái. Gọi trừ/hoàn kho, cập nhật
   thanh toán và trạng thái đơn, đánh dấu `COMPLETED` trong cùng transaction.

Nếu kho thành công nhưng mất phản hồi, lưu đơn lỗi hoặc commit thất bại, transaction
thứ hai rollback; yêu cầu đã commit ở bước đầu vẫn còn. Worker gọi lại cùng
`orderId`/loại thao tác để hoàn thành chuyển trạng thái. Cơ chế này **tiếp tục
thao tác đã nhận**, không tự gọi thao tác ngược khi chưa biết kết quả từ kho.

Inventory phải có [khóa idempotency bền vững](inventory-idempotency.md). Nhờ đó
retry sau timeout hoặc restart không trừ/hoàn lần nữa. Client kho giả lập cũng
nhận diện request lặp, nhưng dữ liệu giả lập chỉ ở bộ nhớ và không dùng để bảo
đảm phục hồi qua restart trong môi trường thật.

## Hành vi API và worker

- Request đổi sang trạng thái khác khi đơn có yêu cầu đang chờ nhận `503` và cần
  thử lại sau. Request cùng trạng thái đích có thể tiếp tục yêu cầu đang chờ.
- Khi xác nhận chưa đồng bộ xong, đơn vẫn hiển thị `PENDING`; yêu cầu hủy bị chặn
  để tránh hủy đơn mà bỏ sót phần kho đã trừ. Sau khi phục hồi xác nhận thành công,
  yêu cầu hủy sẽ đọc `CONFIRMED` dưới khóa và hoàn kho.
- Lỗi `400` xác định từ thao tác kho nguyên tử (ví dụ không đủ hàng) đánh dấu
  `REJECTED`, giữ nguyên đơn và cho phép thao tác mới. Timeout/5xx/lỗi ghi đơn giữ
  yêu cầu ở `PENDING` để retry. Lỗi ở bước thanh toán cũng được retry.
- Worker mặc định kiểm tra mỗi 10 giây, tối đa 100 yêu cầu đến hạn mỗi lượt.
  Thao tác lỗi được lùi 30 giây để các đơn khác có thể tiếp tục được xử lý.
  Nhiều instance cùng chạy worker vẫn phải khóa cùng hàng đơn trước khi xử lý.
- Có thể cấu hình `ORDER_RECOVERY_ENABLED` (mặc định `true`) và
  `ORDER_RECOVERY_DELAY_MS` (mặc định `10000`). Khi tắt worker, request cùng trạng
  thái đích vẫn có thể retry, nhưng sẽ không tự phục hồi sau restart.

Lỗi API sau khi đã lưu yêu cầu không đồng nghĩa thao tác bị hủy: yêu cầu có thể
được worker hoàn thành sau đó. Client cần đọc lại đơn trước khi quyết định thao
tác tiếp. Khi kho hoặc database gặp sự cố kéo dài, đơn bị chặn chuyển trạng thái
cho đến khi phục hồi; không xóa bản ghi `PENDING` để bỏ qua bước đồng bộ.

## Cập nhật database

Dừng các instance order cũ, sao lưu `order_db`, rồi chạy thủ công
`order-service/src/main/resources/db/manual/order-transitions.sql`. Script thêm
`orders.version`, bảng yêu cầu bền vững, index phục hồi và unique index chỉ cho
một yêu cầu `PENDING` trên mỗi đơn. Module chưa có migration runner; Hibernate
`update` không tạo thay unique index có điều kiện này. Sau migration có thể dùng
`JPA_DDL_AUTO=validate` nếu các bảng còn lại đã đúng schema.

Triển khai bản inventory có idempotency trước khi bật bản order mới. Không chạy
lẫn order cũ/mới vì code cũ chưa kiểm tra yêu cầu đang chờ. Không có cách tự suy ra
thao tác kho đã thất lạc từ phiên bản cũ: các đơn lệch trước nâng cấp cần đối soát.

Có thể kiểm tra hàng đợi vận hành bằng truy vấn chỉ đọc:

```sql
SELECT transition_id, order_id, source_status, target_status, state, next_attempt_at
FROM order_transitions
WHERE state = 'PENDING'
ORDER BY next_attempt_at, transition_id;
```

## Kiểm chứng

Test tích hợp chạy transaction thật trên H2: xác nhận/hủy đồng thời, hai worker
cùng xử lý, mất phản hồi sau khi kho commit, lỗi ghi đơn/commit, lỗi thanh toán sau
hoàn kho, phục hồi bằng worker mới, từ chối thiếu hàng, quyền chủ sở hữu và ghi
đè bằng entity cũ. Test kho giả lập kiểm tra retry và hoàn đúng số đã trừ.

Chưa thay thế kiểm thử PostgreSQL và HTTP giữa hai service thật. Trước rollout,
kiểm tra timeout/restart ở ranh giới commit, unique index có điều kiện và số lượng
kho/lịch sử sau retry trên hạ tầng thực.
