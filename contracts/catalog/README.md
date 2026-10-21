# Contract catalog → order

`book-by-id.properties` định nghĩa method, path và các trường order cần đọc.
`book-by-id.json` là response catalog đầy đủ cho cùng một trạng thái provider.
Hai module đưa cùng thư mục contract vào test classpath qua Maven; không sao
chép fixture riêng và không thêm dependency runtime giữa hai service.

- Catalog: `OrderBookContractTests` gọi controller thực qua MockMvc, mock dữ liệu
  nghiệp vụ và kiểm tra JSON do `BookResponse` thực serialize khớp fixture.
- Order: `CatalogClientContractTests` chọn `HttpCatalogClient` trong profile
  `integration`, dùng HTTP loopback phục vụ cùng fixture chỉ tại endpoint hợp đồng,
  kiểm tra ánh xạ ID/tên/giá và lỗi sách không tồn tại. Các trường bổ sung như
  category/authors/timestamps không làm consumer lỗi.

Endpoint là `GET /api/catalog/books/{id}`. `CATALOG_URL` chỉ chứa URL gốc máy chủ
(mặc định `http://localhost:8084`), không chứa tiền tố `/api/catalog`.

Khi thay đổi hợp đồng, chạy `verify` của cả catalog-service và order-service.
Test này kiểm tra đường dẫn/serialization/consumer HTTP; không thay kiểm thử
triển khai với database, Eureka và hai service thật.
