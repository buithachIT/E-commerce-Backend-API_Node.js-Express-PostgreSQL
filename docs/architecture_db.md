### Nhận định dự án: Dữ liệu quan hệ phức tạp, cần tính toàn vẹn cao, tiền bạc, kho bãi...

Có 2 sự lựa chọn là SQL và NoSQL
\*\* SQL :

- Dữ liệu lưu dưới mô hình table được định nghĩa sẵn, cố định, nghiêm ngặt, Có sự liên kết qua khóa ngoại giữa các bảng.
- Điểm mạnh: Tính toàn vẹn dữ liệu, mọi giao dịch phải có trạng thái thành công hoặc thất bại.
- Điểm yếu: Khó mở rộng theo chiều ngang.

\*\* NoSQL :

- Dữ liệu lưu dưới dạng Document (JSON) linh hoạt. Không có khái niệm bảng, cột nghiêm ngặt. Một dòng có thể có thuộc tính này, dòng sau không có cũng chẳng sao.
- Điểm mạnh nhất: Tốc độ ghi (Write) cực nhanh, cấu trúc dữ liệu linh hoạt, dễ dàng mở rộng ra hàng trăm server bằng cách phân mảnh (Sharding).
- Điểm yếu: Khả năng xử lý các mối quan hệ chằng chịt (JOIN) rất kém. Tính toàn vẹn dữ liệu ở mức độ giao dịch phức tạp (Multi-document transaction) không thể bằng SQL.

## =>> Postgres là sự lựa chọn ổn.

//Note:
. Mở rộng theo chiều dọc (Vertical Scaling / Scale Up): Là nâng cấp con VPS lên. Thêm CPU, thêm RAM, thêm SSD. Giống như việc bạn xây nhà cao tầng trên một mảnh đất cố định. Cách này có giới hạn, vì phần cứng máy tính luôn có trần công nghệ (và càng lên cao càng cực kỳ đắt đỏ).
. Mở rộng theo chiều ngang (Horizontal Scaling / Scale Out): Thay vì dùng 1 con server siêu to khổng lồ, bạn mua 10 con server bình thường và chia đều dữ liệu ra cho 10 con đó gánh. Giống như việc bạn xây một dãy nhà phố liền kề.
