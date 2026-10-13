# Quy ước làm việc

- Trả lời bằng tiếng Việt.
- Đọc README, cấu hình và mã liên quan trước khi sửa.
- Giữ nguyên thay đổi có sẵn của người dùng.
- Dùng PowerShell; điều chỉnh ví dụ Bash trong skills cho phù hợp.
- Xác định package manager và test runner từ dự án thực tế.
- Không chạy script riêng của ECC nếu dự án không có script đó.

## Plan
- Khi được yêu cầu chỉ lập kế hoạch, không sửa file.
- Nêu phạm vi, file dự kiến đổi, rủi ro và cách kiểm chứng.

## Code
- Dùng coding-standards và tdd-workflow khi phù hợp.
- Với thay đổi hành vi, ưu tiên test tái hiện trước khi triển khai.
- Không refactor ngoài phạm vi yêu cầu.

## Test
- Dùng verification-loop trước khi báo hoàn thành.
- Chạy các lệnh kiểm tra thực sự tồn tại trong dự án.
- Phân biệt PASS, FAIL và NOT RUN.
- Giữ nguyên chính sách coverage của dự án.

## Review
- Khi chỉ được yêu cầu review, không sửa file.
- Nêu lỗi có bằng chứng, file:dòng, tác động và hướng sửa.
- Không tự commit, push hoặc deploy.