Xây dựng hệ thống bán hàng có các luồng chính như sau:

- Account:
  Hệ thống có 3 vai trò chính: Người bán, người mua, admin.

  Một Tài khoản gồm: tên người dùng, email, mật khẩu, ảnh đại diện, ngày tạo. Người mua có thêm: tên, giới tính. Một người mua có thể lưu Nhiều địa chỉ nhận hàng (Tên người nhận, số điện thoại, số nhà, đường, phường, thành phố). Người bán (Shop) có thêm: tên shop, mô tả shop, địa chỉ lấy hàng, tỉ lệ đánh giá của khách hàng.

- Sản phẩm:
  Một người muốn đăng bán 1 sản phẩm có những thuộc tính như sau: tên, mô tả, số lượng yêu thích của sản phẩm này, số lượng đã bán. Một sản phẩm có nhiều biến thể, các biến thể có thông tin như: tên biến thể, giá, hình ảnh biến thể, số lượng. 1 sản phẩm có nhiều hình ảnh. Tất cả sản phẩm đều phải nằm trong 1 cây phân loại và thuộc 1 thương hiệu. Một sản phẩm sẽ có nhiều đánh giá từ khách hàng, đánh giá bao gồm: số lượng sao (từ 1->5) và nội dung đánh giá, có thể 1 hoặc nhiều tệp nội dung(hình ảnh, video)

- Cây phân loại gồm tên nhánh phân loại, có thể có 1 hoặc nhiều nhánh con.

- Thương hiệu:
  Thương hiệu gồm thông tin tên thương hiệu, nơi sản xuất.

- Giỏ hàng:
  Khi người dùng chọn một sản phẩm, chọn biến thể và thêm vào giỏ hàng, lưu thông tin biến thể sản phẩm đó vào giỏ hàng, ngày thêm vào giỏ hàng.

- Đơn hàng: Sau khi người dùng chọn sản phẩm xong, đưa tới thanh toán và lựa chọn phương thức thanh toán, đơn hàng bao gồm thông tin: Địa chỉ mua hàng, Thông tin từng sản phẩm, tổng đơn giá, trạng thái đơn hàng, trạng thái thanh toán, discount, ngày tạo.

- Discount: Loại giảm giá, giá trị discount, giá trị đơn hàng tối thiếu, giảm tối đa, Ngày nhận, ngày hết hạn, số lượng, voucher có thể do người bán tặng cho người mua hoặc hệ thống tặng.
