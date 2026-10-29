# pempom

Google sign-in and production server setup: [docs/google-auth.md](docs/google-auth.md).
Administration and permissions: [docs/admin.md](docs/admin.md).

Game luyện từ vựng tiếng Anh bằng cách gõ chữ để bắn quái. React 19, TypeScript, Vite và Canvas; lưu dữ liệu bằng Dexie/IndexedDB.

## Khởi chạy

```sh
npm install
npm run dev
```

Mở URL Vite hiển thị, thường là http://localhost:5173. Trên PowerShell bị chặn npm.ps1, dùng `npm.cmd`.

```sh
npm test          # Unit tests
npm run test:e2e  # Browser tests (Playwright)
npm run build    # TypeScript + production build vào build/
```

Browser tests dùng Edge trên Windows, Chromium trên hệ điều hành khác. Nếu chưa có Chromium, chạy `npx playwright install chromium`.

## Đúng 7 mục trong giao diện

1. **Chơi:** sảnh game → chế độ chơi → Đấu thường → chọn map, tướng, đạn, tài liệu → xác nhận vào trận. Các chế độ khác hiển thị Sắp ra mắt. Trong Đấu thường có tùy chọn cách học và độ khó.
2. **Store:** xem thử, mua và trang bị tướng, màu sắc, đạn/kỹ năng bằng xu hiện có. Tủ đồ được đặt bên trong Store.
3. **Bảng xếp hạng:** điểm cao nhất từ các trận thực tế và tab Diễn đàn.
4. **Tài khoản:** đăng ký/đăng nhập, hồ sơ, ví xu, các gói mua xu với giao diện payOS. Cài đặt và quản trị nằm bên trong tài khoản.
5. **Bài học:** bộ từ có sẵn, xem trước, tìm kiếm và tải Excel/CSV (tối đa 5 MB, 5.000 dòng; cần hai cột english/vietnamese). Người chơi thường cũng có thể nhập tài liệu.
6. **Quà tặng:** quà 50 xu hằng ngày theo ngày Việt Nam, lưu/sao chép ý tưởng, sao chép lời mời bạn bè.
7. **Sự kiện:** nhiệm vụ thắng trận đầu và hoàn thành 30 từ; xác minh tiến độ và nhận thưởng một lần.

## Phạm vi dữ liệu và tích hợp

- Tài khoản, ví, bài viết diễn đàn, ý tưởng, phần thưởng và bảng xếp hạng lưu trên trình duyệt hiện tại. Chưa có đồng bộ thiết bị, chat trực tuyến hay bảng xếp hạng toàn cầu. UI ghi rõ phạm vi này.
- Lời mời có mã và liên kết sao chép; chưa có máy chủ xác thực người được mời nên thưởng giới thiệu chưa mở. Ý tưởng được lưu trên máy, chưa tự gửi cho đội ngũ.
- Thanh toán thật chưa bật. Nút thanh toán khóa khi chưa cấu hình API; không cộng xu giả, không tin redirect là bằng chứng thanh toán. Xem [hợp đồng API payOS](docs/payment-api.md) và [.env.example](.env.example).
- Giữ tên cơ sở dữ liệu và khóa lưu cũ để người dùng hiện tại không mất tài khoản, tiến trình, xu, trang bị khi đổi thương hiệu. Tên sprite và các ký hiệu renderer nội bộ giữ tương thích tài nguyên cũ.
- Cấu hình quà khởi đầu, giá Store và trang bị miễn phí đang kế thừa bản game gốc. Không dùng ví cục bộ làm ví tiền thật.

Sảnh có thể xem khi chưa đăng nhập. Trận đấu và thao tác cá nhân yêu cầu tài khoản. Tài khoản đầu tiên vẫn có quyền quản trị theo cơ chế sẵn có.

`spec.md` là đặc tả kỹ thuật ban đầu. Cấu trúc 7 mục và thương hiệu pempom trong bản này thay thế bố cục điều hướng cũ.
