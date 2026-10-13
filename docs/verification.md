# Kết quả kiểm chứng BE2

Ngày: 13/10/2026. JDK 21.0.12.1, Maven Wrapper 3.9.16.

Sau lần tổ chức lại package và tách MetadataService thành CategoryService,
AuthorService, PublisherService: đã chạy lại `clean verify` cho catalog (5 test)
và AI (19 test), tất cả PASS, không test nào bị bỏ qua. Gateway không thay đổi
trong lần tổ chức thư mục nên kết quả gateway bên dưới thuộc lần kiểm chứng trước.
API và schema database giữ nguyên; các request/response đã chuyển sang Dto,
test chuyển sang package theo lớp tương ứng và Integration.

| Hạng mục | Trạng thái | Kết quả |
|---|---|---|
| catalog-service: clean verify | PASS | 5 test, 0 failure/error, tạo executable JAR |
| ai-service: clean verify | PASS | 19 test, 0 failure/error, tạo executable JAR |
| api-gateway: verify | PASS | 1 context test, 0 failure/error, tạo executable JAR |
| Flyway + Hibernate schema validation | PASS | Cả hai service, H2 PostgreSQL mode |
| API catalog | PASS | CRUD, quan hệ, trùng tên, phân trang/lọc/sắp xếp, nhiều tác giả, ẩn sách |
| API security | PASS | 401/403, ADMIN writes, lịch sử theo JWT subject, scope purchase |
| AI adapter | PASS | HTTP mock trên loopback, JSON hợp lệ/sai, output bị cắt, upstream 429, thiếu cấu hình |
| AI orchestration | PASS | Lọc ID bịa/trùng, sách vừa bị ẩn, fallback rõ ràng, catalog lỗi 503 |
| Rate limiting | PASS | Giới hạn đồng thời và số lần gọi theo người dùng |
| PostgreSQL thực / Docker image | NOT RUN | Chưa có Docker CLI trong môi trường kiểm tra |
| Gemini API thật | NOT RUN | Chưa cung cấp API key/model; test không gọi dịch vụ trả phí |
| JWT thật từ BE1 / sự kiện thật từ BE3 | NOT RUN | Các service này chưa có trong workspace |
| Toàn tuyến gateway -> Eureka -> hai service | NOT RUN | Gateway mới kiểm tra context và build |
| Coverage / lint riêng | NOT RUN | Dự án chưa cấu hình runner/ngưỡng; không thay đổi chính sách coverage |
| git diff | NOT RUN | Thư mục workspace không phải Git repository |

Lệnh đã dùng trong catalog-service và ai-service:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21.0.12.1'
.\mvnw.cmd -B -ntp clean verify
```

AI test cần quyền truy cập loopback. Lần chạy sandbox báo Permission denied khi tạo
HTTP mock server; chạy lại ngoài sandbox đã PASS. Không thay test bằng bỏ qua test.

Lệnh đã dùng trong api-gateway:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21.0.12.1'
.\mvnw.cmd -B -ntp verify '-Deureka.client.enabled=false' `
  '-DargLine=-javaagent:C:/Users/apham/.m2/repository/org/mockito/mockito-core/5.23.0/mockito-core-5.23.0.jar'
```

Đường dẫn javaagent trên thuộc máy kiểm tra; điều chỉnh theo Maven local repository
nếu chạy ở máy khác. Hai service mới đã cấu hình javaagent trong POM.
Test ban đầu ở pha RED thất bại vì catalog chưa có SpringBootConfiguration và AI
chưa có lớp nghiệp vụ; sau triển khai đã PASS như bảng trên.

Mã cũ chỉ thay application.yaml của gateway để thêm hai route. Các service cũ và
dữ liệu cũ không bị di chuyển/xóa. Các file mới gồm hai module, README, cấu hình
Compose database, Dockerfile, gitignore và tài liệu kiểm chứng.

Rà soát mã mới: secret lấy từ môi trường, query qua JPA/parameter binding, validate
request, giới hạn page/context, không đưa upstream error hoặc API key vào response.
Đây là kiểm tra mã và test chức năng, không phải kết quả quét CVE/phân tích bảo mật
độc lập. Chưa chạy kiểm thử tải hay đo chất lượng gợi ý với Gemini thực.

## Swagger / OpenAPI (2026-10-13)

- Added springdoc-openapi-starter-webmvc-ui 3.1.1 to catalog-service and ai-service.
- PASS: catalog-service `./mvnw.cmd -B -ntp clean verify`: 8 tests, 0 failures/errors/skips; executable JAR built.
- PASS: ai-service `./mvnw.cmd -B -ntp clean verify`: 22 tests, 0 failures/errors/skips; executable JAR built.
- TDD: the two catalog OpenAPI tests initially failed with HTTP 401 before implementation, then passed.
- Verified with MockMvc: anonymous OpenAPI JSON, Swagger HTML/JS/config; bearer security metadata; public catalog reads; internal AI purchase endpoint excluded from documentation.
- Verified documentation routes are denied even for authenticated callers when app.docs.enabled=false.
- Existing API authentication/authorization regression tests remain passing.
- Tests use H2 and mocked JWT/provider dependencies; local HTTP mocks require loopback permissions.
- NOT RUN: browser interaction with real PostgreSQL, real JWT issuer or Gemini; gateway aggregation is not implemented.
- Lint/coverage: no configured Maven checks; existing project coverage policy unchanged.
- Reviewed modified configuration and security matchers; no changes to local .env credentials or database migrations.
- Git diff unavailable: workspace has no .git directory.
