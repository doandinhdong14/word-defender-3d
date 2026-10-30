# Kết nối thanh toán pempom / payOS

Hệ thống thanh toán payOS đã được tích hợp hoàn chỉnh và kết nối với máy chủ backend.

## Cấu hình môi trường (`.env.local`)
```ini
PAYOS_CLIENT_ID=5173a0ba-69e9-4bae-a1a6-7671617064de
PAYOS_API_KEY=79da19ff-69df-459c-95ea-cada56f23cc6
PAYOS_CHECKSUM_KEY=1d9a42d29f5ec0b55de1b261df0f00df775bd87d4c102f14e3e476893f550254
VITE_PAYMENT_API_URL=/api/payments
```

## Các gói nạp Xu (`COIN_PACKS`)
| packageId | Tên gói | Xu nhận được | Giá VND | Khuyến mãi / Điểm nổi bật |
| --- | --- | ---: | ---: | --- |
| `pocket` | Túi Xu Khởi Đầu | 200 xu | 20,000đ | Vừa đủ mua 1 skin Classic |
| `adventure` | Túi Xu Chiến Binh | 550 xu | 50,000đ | ⭐ Đề xuất: Tặng thêm +50 xu |
| `treasure` | Rương Kho Báu | 1,200 xu | 100,000đ | Tặng thêm +200 xu |
| `vip` | Đại Gia Pempom VIP | 2,600 xu | 200,000đ | Tặng thêm +600 xu |

## Bảng giá Tướng & Skin (Coins & VND)
| ID Skin | Tên Skin | Phân loại | Giá Xu | Giá VND (PayOS) |
| --- | --- | --- | ---: | ---: |
| `outfit_ninja` | Ninja Outfit | Cổ điển / Classic | 220 xu | 20,000đ |
| `outfit_ghost` | Blanket Ghost | Cổ điển / Cute | 240 xu | 20,000đ |
| `outfit_samurai` | Samurai Armor | Chiến binh Samurai | 250 xu | 25,000đ |
| `outfit_builder` | Kỹ Sư Công Trường | Năng động | 260 xu | 25,000đ |
| `outfit_halloween` | Bí Ngô Ma Quái | Lễ hội Halloween | 280 xu | 29,000đ |
| `outfit_basketball` | Cầu Thủ Bóng Rổ #30 | Thể thao năng động | 280 xu | 29,000đ |
| `outfit_soccer` | Siêu Sao Bóng Đá #7 | Thể thao huyền thoại | 280 xu | 29,000đ |
| `outfit_gladiator` | Đấu Sĩ La Mã | Đấu sĩ dũng mãnh | 290 xu | 29,000đ |
| `outfit_dino` | Chiến Binh Khủng Long | Cute đặc biệt | 300 xu | 35,000đ |
| `outfit_banana_cat` | Mèo Chuối Siêu Quậy | Cute đặc biệt | 300 xu | 35,000đ |
| `outfit_teddy_bear` | Gấu Bông Chắp Vá | Cute đặc biệt | 300 xu | 35,000đ |
| `outfit_football` | Cầu Thủ Số 10 | Siêu sao bóng đá | 310 xu | 35,000đ |
| `outfit_shinobi` | Nhẫn Giả Bạch Y | Nhẫn giả huyền thoại | 310 xu | 35,000đ |
| `outfit_boba_rabbit` | Thỏ Trà Sữa Trân Châu | VIP Dễ thương | 320 xu | 39,000đ |
| `outfit_hunter` | Thợ Săn Tiền Sử | VIP Hoang dã | 320 xu | 39,000đ |
| `outfit_musician` | Nhạc Trưởng Quý Tộc | VIP Quý tộc | 320 xu | 39,000đ |
| `outfit_coral` | Nữ Hoàng San Hô | Huyền thoại biển sâu | 330 xu | 45,000đ |
| `outfit_hacker` | Hacker Cyberpunk | Siêu phẩm Neon Matrix | 340 xu | 49,000đ |

## API Backend (`server/payments.mjs`)
1. `GET /api/payments/config`: Trả về trạng thái kích hoạt cổng thanh toán, danh sách gói xu và bảng giá skin.
2. `POST /api/payments/checkout`: Tạo payment link PayOS (`{ packageId }` hoặc `{ skinId }`). Yêu cầu đăng nhập tài khoản.
3. `GET /api/payments/order/:orderCode`: Truy vấn trạng thái đơn hàng. Nếu trạng thái PayOS là `PAID`, máy chủ tự động cập nhật số dư ví hoặc mở khóa skin trong cơ sở dữ liệu và đánh dấu đã xử lý (chống cộng trùng lặp).
4. `POST /api/payments/webhook`: Nhận webhook từ payOS, xác thực chữ ký HMAC SHA256 và kích hoạt hoàn tất đơn hàng.
5. `GET /api/payments/sync`: Đồng bộ số dư và kho đồ máy chủ về trình duyệt người dùng.
