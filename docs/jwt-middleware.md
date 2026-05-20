### Đề bài:

Bạn đang đứng ở cổng Backend. Một request từ Frontend bay tới. Hãy liệt kê các bước bạn sẽ xử lý từ lúc nhận request đến lúc cho phép nó đi tiếp vào trong:

1. Trích xuất: Bạn tìm Token ở đâu? (Tên header là gì? Bạn phải xử lý chuỗi đó như thế nào để lấy được mã Token sạch?).

2. Kiểm tra sự tồn tại: Nếu User không gửi gì lên, bạn làm gì?

3. Xác thực: Bạn dùng cái gì để biết Token này là do "chính chủ" Backend của bạn ký ra chứ không phải do hacker tự chế?

4. Xử lý kết quả:

Nếu Token hợp lệ: Bạn làm sao để các hàm sau đó (ví dụ hàm getProfile) biết được id của user vừa đăng nhập?

Nếu Token hết hạn hoặc sai chữ ký: Bạn trả về mã lỗi (Status Code) nào và thông báo gì?

5. Tiếp tục: Bạn dùng lệnh gì để cho phép request đi tiếp vào các hàm xử lý bên trong?

### Trả lời:

1. : Thường fe sẽ customize axios như này:config.headers.Authorization = `Bearer ${token}`;
   Chi tiết:
   1, Tạo 1 biến authHeader = req.headers.authorization
   2, Kiểm tra: nếu authHeader này không tồn tại => trả về 401(unauthorized). Nếu authHeader này có tồn tại nhưng không bắt đầu bằng chuỗi bearer thì cũng 401.
   3, Trích xuất token sạch: dùng hàm cắt chuỗi .split(" ")[1] để lấy token sạch.
   \*NOTE\*
   Có các loại cơ chế Prefix như:
   - Basic <chuỗi_base64> (chuỗi base_64 là từ username:password được mã hóa)
   - API key: Phổ biến khi dùng dịch vụ OpenAPI, AWS...
   - Digest: hashpassword từ server gởi xuống.
2. Nếu User không gửi gì lên, trả lỗi 401.
3. Mình có tạo 1 secretkey ở env, mình sẽ xác minh danh tính mã jwt đó bằng secret key đã lưu. Nếu ok thì gán req.user còn sai thì 401.
4. Lưu req.user=payload do hàm verify trả payload.
5. Next() để thông quan.