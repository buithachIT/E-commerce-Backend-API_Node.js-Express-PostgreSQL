Structure explain:

- Utils: Viết hàm tần xuất sử dụng nhiều. (Ex: Int=> str, uppcase...)
- Helper: Hàm tần xuất gọi ít. Có chức năng unique.
- .env: Lưu trữ thông tin nhạy cảm.

config file: Lưu trữ cấu hình cho application.

1. Library utilities for project:
   morgan - log mỗi request.
   helmet - bảo vệ header, ẩn bớt thông tin công nghệ.
   compression - nén data trả về.
2. DB connection:
   Pool size: số lượng kết nối mở sẵn từ hệ thống xuống database
