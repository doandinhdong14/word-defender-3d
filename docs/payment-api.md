# Kết nối thanh toán pempom / payOS

Giao diện nằm trong **Tài khoản → Mua xu**. Mặc định nút thanh toán khóa và thông báo đang thiết lập, không tạo giao dịch giả hay cộng xu từ dữ liệu redirect.

Đặt `VITE_PAYMENT_API_URL=https://your-backend.example/api/payments` khi đã có backend đáng tin cậy. Frontend gửi `POST {VITE_PAYMENT_API_URL}/checkout`, `credentials: include`, JSON `{ "packageId": "adventure" }`; server trả `{ "checkoutUrl": "https://pay.payos.vn/web/..." }`. Backend khác origin cần cấu hình cookie/CORS theo origin cụ thể.

Các gói hiển thị hiện là cấu hình mẫu cần thống nhất với backend:

| packageId | Xu | VND |
| --- | ---: | ---: |
| pocket | 200 | 20000 |
| adventure | 550 | 50000 |
| treasure | 1200 | 100000 |

Backend phải xác thực phiên tài khoản trên máy chủ, tự tra giá theo packageId, tạo và lưu đơn hàng gắn với tài khoản. Không dùng tài khoản hoặc ví IndexedDB làm nguồn xác thực thanh toán. Bản hiện tại chưa có backend xác thực và ví máy chủ, nên không bật thanh toán thật chỉ bằng cách điền URL.

Giữ Client ID, API Key, Checksum Key ở server. Tạo payment request qua payOS; trả checkoutUrl cho trình duyệt. Khi nhận webhook, xác minh chữ ký HMAC SHA256, trạng thái, mã đơn, số tiền; cập nhật ví máy chủ và đánh dấu đã xử lý trong cùng giao dịch để không cộng xu hai lần. Sau đó bổ sung API đồng bộ ví máy chủ về giao diện. Không tin returnUrl/cancelUrl là bằng chứng đã trả tiền.

Tài liệu chính thức: [API payOS](https://payos.vn/docs/api/), [xác minh chữ ký](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/), [Node SDK](https://payos.vn/docs/sdks/back-end/node/).
